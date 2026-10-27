import { and, eq, lt } from "drizzle-orm";
import type { AppDb } from "@/lib/db/client";
import { syncLease } from "@/lib/db/schema";

// Comfortably inside Vercel Hobby's ~300s function timeout, with margin for
// the lease to naturally expire and be reclaimed if the function is killed
// without reaching the explicit release.
const LEASE_DURATION_MS = 4.5 * 60 * 1000;

/**
 * Atomically acquires the one-row-per-challenge sync lease — same proven
 * single-statement pattern as lib/rate-limit.ts's rate_limit_bucket: an
 * INSERT ... ON CONFLICT DO UPDATE ... WHERE that only actually updates
 * (and returns a row) if the existing lease has expired. No read-then-write
 * race is possible between two concurrent "Sync now" clicks.
 */
export async function acquireSyncLease(db: AppDb, challengeId: string, lockedBy: string): Promise<boolean> {
  const now = new Date();
  const lockedUntil = new Date(now.getTime() + LEASE_DURATION_MS);

  const rows = await db
    .insert(syncLease)
    .values({ challengeId, lockedUntil, lockedBy })
    .onConflictDoUpdate({
      target: syncLease.challengeId,
      set: { lockedUntil, lockedBy },
      setWhere: lt(syncLease.lockedUntil, now),
    })
    .returning({ challengeId: syncLease.challengeId });

  return rows.length > 0;
}

/** Explicit early release once a sync finishes — lets the next "Sync now" proceed immediately instead of waiting out the full lease duration. */
export async function releaseSyncLease(db: AppDb, challengeId: string, lockedBy: string): Promise<void> {
  await db.delete(syncLease).where(and(eq(syncLease.challengeId, challengeId), eq(syncLease.lockedBy, lockedBy)));
}
