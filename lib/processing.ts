import { and, asc, desc, eq, isNull, lt, or, sql } from "drizzle-orm";
import type { AppDb } from "@/lib/db/client";
import { processingBudget, submission } from "@/lib/db/schema";
import { isGraceElapsed } from "@/lib/timezone";
import { MetaGraphError, type MetaGraphClient } from "@/lib/meta-graph";

/** Bounded retry (Slice B decision): give up after this many attempts, promoting to error_permanent. */
export const MAX_RETRY_ATTEMPTS = 5;
/** Exponential backoff, indexed by (retryCount - 1), capped at the last entry. */
const RETRY_BACKOFF_MINUTES = [1, 2, 4, 8, 16];
/** Execution-budget bound (distinct from processing capacity/allowance) — a safety cap on Meta calls per sync, independent of Vercel's time budget. */
const MAX_VERIFICATIONS_PER_RUN = 30;

export interface ProcessingChallengeInput {
  id: string;
  timezone: string;
  processingGracePeriodHours: number;
  dailyProcessingCapacity: number | null;
}

export interface ProcessingResult {
  attempted: number;
  completed: number;
  permanentFailures: number;
  status: "completed" | "partial" | "error";
  errorMessage?: string;
  /** Set only when a connection-wide rate limit stopped the run — the earliest instant it's worth syncing again. */
  rateLimitedUntil?: Date;
}

/** Milliseconds to wait before retrying a given retryCount, per the generic exponential schedule alone. */
function genericBackoffMs(retryCount: number): number {
  const minutes = RETRY_BACKOFF_MINUTES[Math.min(retryCount - 1, RETRY_BACKOFF_MINUTES.length - 1)];
  return minutes * 60 * 1000;
}

/** Meta didn't supply a Retry-After header — a conservative guess, not a documented value. */
const DEFAULT_RATE_LIMIT_BACKOFF_SECONDS = 60;

function backoffElapsed(retryCount: number, lastAttemptedAt: Date | null, retryNotBeforeAt: Date | null, now: Date): boolean {
  // retryNotBeforeAt, when set, already IS the later of the generic
  // schedule and any Retry-After hint (computed once, at failure time —
  // see recordTransientFailure) — so checking it alone is sufficient here.
  if (retryNotBeforeAt) return now.getTime() >= retryNotBeforeAt.getTime();
  if (retryCount === 0 || !lastAttemptedAt) return true;
  return now.getTime() - lastAttemptedAt.getTime() >= genericBackoffMs(retryCount);
}

async function ensureBudgetRow(db: AppDb, challengeId: string, localDay: string, capacitySnapshot: number | null) {
  await db
    .insert(processingBudget)
    .values({ challengeId, localDay, capacity: capacitySnapshot })
    .onConflictDoNothing({ target: [processingBudget.challengeId, processingBudget.localDay] });
  const [row] = await db
    .select()
    .from(processingBudget)
    .where(and(eq(processingBudget.challengeId, challengeId), eq(processingBudget.localDay, localDay)))
    .limit(1);
  return row;
}

/**
 * Atomic, exactly-once completion: the budget charge and the submission's
 * terminal transition happen in one transaction, guarded by two conditions
 * that make a concurrent/duplicate attempt a safe no-op rather than a
 * double-charge — (1) the budget UPDATE only matches if capacity isn't
 * already exhausted, (2) the submission UPDATE only matches if it's still
 * `pending`. If either fails to match, the whole transaction rolls back
 * and this returns false, leaving the submission untouched (still
 * `pending`, safe to attempt again later).
 */
async function completeSubmission(
  db: AppDb,
  submissionId: string,
  challengeId: string,
  localDay: string,
  mentionResult: "verified" | "not_verified",
  verifiedData?: { username: string | null; caption: string | null; mediaType: string | null; mediaUrl: string | null; thumbnailUrl: string | null; permalink: string | null }
): Promise<boolean> {
  try {
    await db.transaction(async (tx) => {
      const budgetCharge = await tx
        .update(processingBudget)
        .set({ consumed: sql`${processingBudget.consumed} + 1` })
        .where(
          and(
            eq(processingBudget.challengeId, challengeId),
            eq(processingBudget.localDay, localDay),
            or(isNull(processingBudget.capacity), lt(processingBudget.consumed, processingBudget.capacity))
          )
        )
        .returning({ id: processingBudget.id });
      if (budgetCharge.length === 0) throw new Error("budget exhausted");

      const now = new Date();
      const subUpdate = await tx
        .update(submission)
        .set({
          processingStatus: "completed",
          mentionResult,
          processingCheckedAt: now,
          lastAttemptedAt: now,
          ...(verifiedData
            ? {
                creatorUsername: verifiedData.username,
                mediaUrl: verifiedData.mediaUrl,
                thumbnailUrl: verifiedData.thumbnailUrl,
                permalink: verifiedData.permalink ?? undefined,
                caption: verifiedData.caption ?? undefined,
                mediaType: verifiedData.mediaType ?? undefined,
              }
            : {}),
        })
        .where(and(eq(submission.id, submissionId), eq(submission.processingStatus, "pending")))
        .returning({ id: submission.id });
      if (subUpdate.length === 0) throw new Error("submission no longer pending");
    });
    return true;
  } catch {
    return false;
  }
}

/** Technical failure that will never resolve — no budget charge, immediately terminal (no retry cap wait, already known permanent). */
async function markPermanentFailure(db: AppDb, submissionId: string): Promise<void> {
  await db
    .update(submission)
    .set({
      processingStatus: "error_permanent",
      lastAttemptedAt: new Date(),
      retryCount: sql`${submission.retryCount} + 1`,
    })
    .where(eq(submission.id, submissionId));
}

/**
 * A submission-specific transient failure (network blip, a one-off 5xx on
 * this particular candidate) — stays `pending` so the same backlog query
 * re-selects it once backoff elapses; promoted to error_permanent only
 * after MAX_RETRY_ATTEMPTS. Deliberately NOT called for `rate_limited`
 * errors (handled inline in runProcessing's catch block instead) since a
 * rate limit reflects the whole connection's standing with Meta, not
 * anything wrong with this candidate, and must never count toward it
 * being given up on.
 *
 * `retryAfterSeconds`, when this failure happened to carry one (a 5xx can
 * legitimately include Retry-After too), sets the next-eligible instant to
 * the LATER of the generic exponential-backoff deadline and the
 * Retry-After deadline — Meta's own signal should only ever extend the
 * wait, never shorten the minimum the generic schedule already implies.
 * Otherwise any stale hint from an earlier failure is explicitly cleared.
 */
async function recordTransientFailure(db: AppDb, submissionId: string, nextRetryCount: number, retryAfterSeconds: number | null = null): Promise<void> {
  const now = Date.now();
  const retryNotBeforeAt =
    retryAfterSeconds !== null ? new Date(Math.max(now + genericBackoffMs(nextRetryCount), now + retryAfterSeconds * 1000)) : null;
  await db
    .update(submission)
    .set({
      retryCount: nextRetryCount,
      lastAttemptedAt: new Date(now),
      retryNotBeforeAt,
      ...(nextRetryCount >= MAX_RETRY_ATTEMPTS ? { processingStatus: "error_permanent" as const } : {}),
    })
    .where(eq(submission.id, submissionId));
}

/**
 * Allocation + verification for one sync. Iterates challenge-local days
 * whose grace period has elapsed, most-recent-first (pilot decision:
 * "prioritize yesterday's submissions today"), spending each day's
 * remaining budget on its backlog ordered by the permanent random
 * `allocationRank` — never by publish time or discovery order.
 *
 * Both the day-selection and candidate-selection queries require
 * `dateEligible = true` — a submission published outside the challenge's
 * configured date range can never become gallery-eligible regardless of its
 * mention result, so it must never be allocated, verified, or charged
 * against a day's processing_budget. It stays `pending` indefinitely
 * (visible in diagnostics, never silently dropped) rather than consuming
 * the monetized resource for an evaluation that can't produce a usable
 * result.
 *
 * Throws MetaGraphError for token_invalid/permissions — the caller must
 * stop the whole sync and surface a reconnection/permissions message,
 * never retry these per-submission (no individual retryCount increment).
 */
export async function runProcessing(
  db: AppDb,
  client: MetaGraphClient,
  igUserId: string,
  challenge: ProcessingChallengeInput,
  deadline: number
): Promise<ProcessingResult> {
  let attempted = 0;
  let completed = 0;
  let permanentFailures = 0;
  let status: "completed" | "partial" | "error" = "completed";
  let errorMessage: string | undefined;

  const daysRows = await db
    .selectDistinct({ challengeLocalDay: submission.challengeLocalDay })
    .from(submission)
    .where(and(eq(submission.challengeId, challenge.id), eq(submission.processingStatus, "pending"), eq(submission.dateEligible, true)))
    .orderBy(desc(submission.challengeLocalDay));
  const eligibleDays = daysRows
    .map((r) => r.challengeLocalDay)
    .filter((day) => isGraceElapsed(day, challenge.timezone, challenge.processingGracePeriodHours));

  dayLoop: for (const localDay of eligibleDays) {
    const budgetRow = await ensureBudgetRow(db, challenge.id, localDay, challenge.dailyProcessingCapacity);
    let remaining = budgetRow.capacity === null ? Infinity : Math.max(0, budgetRow.capacity - budgetRow.consumed);
    if (remaining <= 0) continue;

    const candidates = await db
      .select()
      .from(submission)
      .where(
        and(
          eq(submission.challengeId, challenge.id),
          eq(submission.challengeLocalDay, localDay),
          eq(submission.processingStatus, "pending"),
          eq(submission.dateEligible, true)
        )
      )
      .orderBy(asc(submission.allocationRank));

    for (const candidate of candidates) {
      if (remaining <= 0) continue dayLoop;
      if (attempted >= MAX_VERIFICATIONS_PER_RUN || Date.now() >= deadline) {
        status = "partial";
        return { attempted, completed, permanentFailures, status, errorMessage };
      }
      if (!backoffElapsed(candidate.retryCount, candidate.lastAttemptedAt, candidate.retryNotBeforeAt, new Date())) continue;

      let result;
      try {
        result = await client.fetchMentionedMedia(igUserId, candidate.mediaId);
      } catch (err) {
        if (err instanceof MetaGraphError && (err.kind === "token_invalid" || err.kind === "permissions")) {
          throw err;
        }
        attempted++;
        if (err instanceof MetaGraphError && err.kind === "rate_limited") {
          // Connection-wide, not this candidate's fault — leave its
          // retryCount/lastAttemptedAt/retryNotBeforeAt completely
          // untouched (it's exactly as eligible for processing next time
          // as it was before this attempt) and stop the whole run rather
          // than burn the rest of this run's budget on calls likely to
          // fail the same way.
          const rateLimitedUntil = new Date(Date.now() + (err.retryAfterSeconds ?? DEFAULT_RATE_LIMIT_BACKOFF_SECONDS) * 1000);
          status = "partial";
          errorMessage = err.message;
          return { attempted, completed, permanentFailures, status, errorMessage, rateLimitedUntil };
        }
        await recordTransientFailure(db, candidate.id, candidate.retryCount + 1, err instanceof MetaGraphError ? err.retryAfterSeconds : null);
        continue;
      }

      attempted++;
      if (result.outcome === "inaccessible") {
        await markPermanentFailure(db, candidate.id);
        permanentFailures++;
        continue;
      }

      const mentionResult = result.outcome === "verified" ? "verified" : "not_verified";
      const charged = await completeSubmission(
        db,
        candidate.id,
        challenge.id,
        localDay,
        mentionResult,
        result.outcome === "verified" ? result.data : undefined
      );
      if (charged) {
        completed++;
        remaining--;
      } else {
        // Budget exhausted (defensive — shouldn't happen under the single
        // per-challenge sync lease, but never trust that alone): stop
        // spending on this day, move to the next.
        continue dayLoop;
      }
    }
  }

  return { attempted, completed, permanentFailures, status, errorMessage };
}
