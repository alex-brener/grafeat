import { pgTable, text, date, integer, timestamp, uniqueIndex, check } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { challenge } from "./challenge";

/**
 * Processing-capacity accounting, one row per (challenge, challenge-local
 * publication day — NOT per sync run or sync-execution day, so an organizer
 * who syncs after several missed days still finds every historical day's
 * unused capacity intact) — deliberately separate from the gallery/review
 * model, per the Slice B revised decision "we sell processing capacity, not
 * gallery visibility." A processed submission's `reviewStatus` and
 * visibility in the gallery never depend on this table; this table only
 * tracks how many processing units a day has used against its budget.
 *
 * `capacity` is a snapshot, not a live lookup — null means unlimited (the
 * pilot/dev default, Slice B decision #8). Snapshotting means a later
 * change to `challenge.dailyProcessingCapacity` (or, eventually, a
 * subscription-plan lookup) only affects *new* days' rows, keeping past
 * days auditable even if entitlements change. If capacity is later
 * *decreased* below `consumed`, already-completed submissions are never
 * touched or un-processed — remaining budget just reads as zero (clamped
 * at the application layer, not a DB constraint, since enforcing
 * `consumed <= capacity` here would make a legitimate decrease impossible
 * to record).
 *
 * `consumed` counts only successfully evaluated candidates (processing_
 * status transitioning to 'completed') — never technical failures
 * (`error_permanent`) and never a transient retry. Incremented by the
 * (not-yet-built, Slice B Phase 3) allocation engine in the same
 * transaction as the submission's terminal-state UPDATE, guarded by that
 * UPDATE's `WHERE processing_status = 'pending'` so a row can only ever
 * cause one increment, including under concurrent/duplicate attempts. See
 * the Slice B processing-allocation proposal for the full accounting rules.
 */
export const processingBudget = pgTable(
  "processing_budget",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    challengeId: text("challenge_id")
      .notNull()
      .references(() => challenge.id, { onDelete: "cascade" }),
    localDay: date("local_day", { mode: "string" }).notNull(),
    capacity: integer("capacity"),
    consumed: integer("consumed").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("processing_budget_challenge_local_day_uidx").on(table.challengeId, table.localDay),
    check("processing_budget_capacity_nonneg", sql`${table.capacity} IS NULL OR ${table.capacity} >= 0`),
    check("processing_budget_consumed_nonneg", sql`${table.consumed} >= 0`),
  ]
);

export const processingBudgetRelations = relations(processingBudget, ({ one }) => ({
  challenge: one(challenge, {
    fields: [processingBudget.challengeId],
    references: [challenge.id],
  }),
}));
