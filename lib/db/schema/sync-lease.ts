import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { challenge } from "./challenge";

/**
 * One row per challenge, at most — the atomic concurrency lock for "Sync
 * now". Same proven technique as lib/rate-limit.ts's rate_limit_bucket: a
 * single INSERT ... ON CONFLICT DO UPDATE ... WHERE statement either
 * acquires the lease (and returns a row) or finds it still held by someone
 * else and returns nothing — one round trip, no read-then-write race.
 * `lockedUntil` expiring naturally recovers from a crashed/timed-out sync
 * without needing any cleanup job.
 */
export const syncLease = pgTable("sync_lease", {
  challengeId: text("challenge_id")
    .primaryKey()
    .references(() => challenge.id, { onDelete: "cascade" }),
  lockedUntil: timestamp("locked_until").notNull(),
  // Diagnostic only (which run holds it) — never security-load-bearing.
  lockedBy: text("locked_by").notNull(),
});
