import { and, asc, eq, sql } from "drizzle-orm";
import type { AppDb } from "@/lib/db/client";
import { submission } from "@/lib/db/schema";
import { isGraceElapsed } from "@/lib/timezone";

export interface ReviewPoolChallengeInput {
  id: string;
  timezone: string;
  processingGracePeriodHours: number;
  dailyReviewLimit: number;
}

export interface ReviewPoolResult {
  admitted: number;
}

/**
 * Admits up to `dailyReviewLimit` eligible, verified submissions per
 * challenge-local day into that day's stable review sample
 * (`sampledForReview`), ordered by the permanent random `allocationRank` —
 * never by publish time or discovery order (same ordering rationale as
 * lib/processing.ts's candidate selection). Membership is persisted and
 * monotonic (false -> true only): a submission already admitted is never
 * dropped, even if `dailyReviewLimit` is later decreased.
 *
 * Re-running against an already-full day matches zero rows, so calling this
 * once per sync for every grace-elapsed day (not only newly-crossed ones)
 * is what lets a still-under-capacity day keep incrementally filling as
 * later syncs discover/verify more candidates — no separate "top-up" code
 * path needed.
 *
 * Runs inside the caller's existing per-challenge sync_lease (lib/sync.ts)
 * — no new lock. A `dailyReviewLimit` change racing an in-flight sync can
 * at worst admit up to the limit in effect when this ran; self-correcting
 * on the next sync, never evicts. See docs/UX-A-IMPLEMENTATION.md §5.
 *
 * Each admission is a single conditional UPDATE, which Postgres already
 * executes atomically — unlike lib/processing.ts's completeSubmission,
 * there's no second table to keep in lockstep, so no explicit transaction
 * wrapper is needed.
 */
export async function admitToReviewPool(db: AppDb, challenge: ReviewPoolChallengeInput): Promise<ReviewPoolResult> {
  let admitted = 0;

  const dayRows = await db.selectDistinct({ challengeLocalDay: submission.challengeLocalDay }).from(submission).where(eq(submission.challengeId, challenge.id));
  const eligibleDays = dayRows
    .map((r) => r.challengeLocalDay)
    .filter((day) => isGraceElapsed(day, challenge.timezone, challenge.processingGracePeriodHours));

  for (const localDay of eligibleDays) {
    const [{ sampledCount }] = await db
      .select({ sampledCount: sql<number>`count(*)::int` })
      .from(submission)
      .where(and(eq(submission.challengeId, challenge.id), eq(submission.challengeLocalDay, localDay), eq(submission.sampledForReview, true)));

    const remaining = challenge.dailyReviewLimit - sampledCount;
    if (remaining <= 0) continue;

    const candidates = await db
      .select({ id: submission.id })
      .from(submission)
      .where(
        and(
          eq(submission.challengeId, challenge.id),
          eq(submission.challengeLocalDay, localDay),
          eq(submission.processingStatus, "completed"),
          eq(submission.mentionResult, "verified"),
          eq(submission.dateEligible, true),
          eq(submission.sampledForReview, false)
        )
      )
      .orderBy(asc(submission.allocationRank))
      .limit(remaining);

    for (const candidate of candidates) {
      const result = await db
        .update(submission)
        .set({ sampledForReview: true })
        .where(and(eq(submission.id, candidate.id), eq(submission.sampledForReview, false)))
        .returning({ id: submission.id });
      if (result.length > 0) admitted++;
    }
  }

  return { admitted };
}
