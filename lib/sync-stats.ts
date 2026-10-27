import { desc, eq } from "drizzle-orm";
import type { AppDb } from "@/lib/db/client";
import { submission, syncRun } from "@/lib/db/schema";

export interface ChallengeSyncStats {
  discovered: number;
  pending: number;
  completed: number;
  errorPermanent: number;
  /** completed + verified + date-eligible — the set a future gallery would show. */
  eligible: number;
  lastSyncRun: {
    status: string;
    startedAt: Date;
    completedAt: Date | null;
    lastError: string | null;
  } | null;
}

/** Read-only summary for the challenge detail page — reduced in JS rather than SQL aggregation, fine at pilot data volumes. */
export async function getChallengeSyncStats(db: AppDb, challengeId: string): Promise<ChallengeSyncStats> {
  const rows = await db
    .select({ processingStatus: submission.processingStatus, mentionResult: submission.mentionResult, dateEligible: submission.dateEligible })
    .from(submission)
    .where(eq(submission.challengeId, challengeId));

  let pending = 0;
  let completed = 0;
  let errorPermanent = 0;
  let eligible = 0;
  for (const row of rows) {
    if (row.processingStatus === "pending") pending++;
    if (row.processingStatus === "completed") completed++;
    if (row.processingStatus === "error_permanent") errorPermanent++;
    if (row.processingStatus === "completed" && row.mentionResult === "verified" && row.dateEligible) eligible++;
  }

  const [lastRun] = await db.select().from(syncRun).where(eq(syncRun.challengeId, challengeId)).orderBy(desc(syncRun.startedAt)).limit(1);

  return {
    discovered: rows.length,
    pending,
    completed,
    errorPermanent,
    eligible,
    lastSyncRun: lastRun ? { status: lastRun.status, startedAt: lastRun.startedAt, completedAt: lastRun.completedAt, lastError: lastRun.lastError } : null,
  };
}
