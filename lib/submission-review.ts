import { and, eq } from "drizzle-orm";
import type { AppDb } from "@/lib/db/client";
import { submission } from "@/lib/db/schema";
import { getChallenge } from "@/lib/challenge";

export const REVIEW_DECISIONS = ["selected", "rejected", "unreviewed"] as const;
export type ReviewDecision = (typeof REVIEW_DECISIONS)[number];

export type SetReviewResult = { outcome: "updated"; reviewStatus: ReviewDecision } | { outcome: "not_found" };

/**
 * The curator's one reversible decision point. Workspace-scoped via
 * getChallenge the same way sync/discovery are — "doesn't exist" and
 * "belongs to another workspace" return the identical not_found outcome.
 * A submissionId that exists but belongs to a *different* challenge than
 * `challengeId` also reports not_found (the WHERE clause below requires
 * both to match), never silently updating the wrong challenge's row.
 *
 * This is the only code path in the app allowed to write reviewStatus —
 * discovery/processing (lib/discovery.ts, lib/processing.ts) never touch
 * it, by convention, so a sync can never clobber a curator's decision.
 * "unreviewed" is a first-class decision here, not just a default — it's
 * how an undo is expressed.
 */
export async function setSubmissionReviewStatus(
  db: AppDb,
  organizationId: string,
  challengeId: string,
  submissionId: string,
  decision: ReviewDecision
): Promise<SetReviewResult> {
  const challenge = await getChallenge(db, organizationId, challengeId);
  if (!challenge) return { outcome: "not_found" };

  const result = await db
    .update(submission)
    .set({ reviewStatus: decision })
    .where(and(eq(submission.id, submissionId), eq(submission.challengeId, challengeId)))
    .returning({ id: submission.id });

  return result.length > 0 ? { outcome: "updated", reviewStatus: decision } : { outcome: "not_found" };
}
