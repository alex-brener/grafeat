import { pgTable, text, integer, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { challenge } from "./challenge";

export const syncRunStatusEnum = pgEnum("sync_run_status", ["running", "completed", "partial", "error"]);

/**
 * One row per sync invocation. Also doubles as the "last sync" status
 * source for the UI (most recent row per challenge) — no separate
 * denormalized column on `challenge` needed.
 *
 * `cursor` only matters for resuming a `partial` run shortly after it was
 * cut off by the execution-time/page budget — it is NOT used to decide
 * where a later, fresh sync should start. A later sync always restarts
 * discovery from page one (recent_media's natural newest-first order),
 * since the goal is catching newly-appeared posts, not continuing an old
 * scan; the DB's uniqueness constraint on submission makes re-scanning
 * overlapping pages cheap and safe.
 *
 * Allocation/budget progress is NOT tracked here — that's
 * processing_budget, keyed by (challengeId, localDay) rather than by sync
 * run, since a day's budget persists and accumulates across many syncs.
 */
export const syncRun = pgTable(
  "sync_run",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    challengeId: text("challenge_id")
      .notNull()
      .references(() => challenge.id, { onDelete: "cascade" }),
    status: syncRunStatusEnum("status").notNull().default("running"),
    // Sanitized cursor value only — never a full paging.next URL (which
    // would carry an embedded access token).
    cursor: text("cursor"),
    pagesScanned: integer("pages_scanned").notNull().default(0),
    itemsScanned: integer("items_scanned").notNull().default(0),
    newCandidates: integer("new_candidates").notNull().default(0),
    existingCandidates: integer("existing_candidates").notNull().default(0),
    // Processing (mention verification) has no cursor of its own — it's
    // driven entirely by submission.processingStatus (pending/retryable
    // rows), so "resuming" is just querying that state again. This counts
    // how many attempts this run completed (any processingStatus outcome),
    // for progress display only — not the same as the allocation engine's
    // per-day budget accounting (processing_budget).
    processedCount: integer("processed_count").notNull().default(0),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
    lastError: text("last_error"),
  },
  (table) => [index("sync_run_challenge_id_idx").on(table.challengeId)]
);

export const syncRunRelations = relations(syncRun, ({ one }) => ({
  challenge: one(challenge, {
    fields: [syncRun.challengeId],
    references: [challenge.id],
  }),
}));
