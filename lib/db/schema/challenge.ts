import { pgTable, text, date, timestamp, integer, pgEnum, index, check } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { organization } from "./auth";

// "ended" is deliberately not a stored value — see lib/timezone.ts's
// deriveChallengeStatus. It's a derived display state (active + endDate
// passed), computed at read time, never persisted: draft challenges stay
// draft regardless of date, and ended challenges remain fully accessible
// and syncable, so there's nothing a third stored value would gate.
export const challengeStatusEnum = pgEnum("challenge_status", ["draft", "active"]);

export const challenge = pgTable(
  "challenge",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // Normalized: trimmed, lowercased, leading '#' stripped — the canonical
    // form used for both display and the Graph API's `q` param.
    hashtag: text("hashtag").notNull(),
    // Cached after the first successful ig_hashtag_search resolution — null
    // until then. Never re-resolved after that (quota: ~30 unique hashtags
    // per IG user per rolling 7 days).
    hashtagId: text("hashtag_id"),
    // Snapshot of the connected organizer's Instagram username at creation
    // time — display-only ("submissions must mention @..."), not used by
    // the verification API call itself (that uses the connection's
    // organizer_ig_id directly, independent of this snapshot).
    requiredMention: text("required_mention").notNull(),
    // Date-only (no time-of-day) — interpreted in `timezone` below, not UTC
    // and not the server's local time.
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }).notNull(),
    // IANA zone name (e.g. "America/New_York") — defaults to the creating
    // organizer's browser-detected zone, but is explicit and stored, never
    // inferred again later. Used for both eligibility windows and the
    // derived "ended" display status.
    timezone: text("timezone").notNull(),
    status: challengeStatusEnum("status").notNull().default("draft"),
    // Processing-unit budget per challenge-local day — null means unlimited,
    // the pilot/dev default (Slice B revised decision #8: capacity is a
    // provisional product hypothesis, not a billing feature). A future
    // subscription-plan lookup would supply this value instead of a manual
    // per-challenge setting; snapshotted onto processing_budget rows per day
    // for audit so a later plan change doesn't rewrite history. Not exposed
    // in the Slice B UI.
    dailyProcessingCapacity: integer("daily_processing_capacity"),
    // Hours after a challenge-local publication day ends before that day's
    // backlog becomes allocatable — lets Instagram's hashtag-indexing lag
    // settle before the allocation engine draws a "final" random sample for
    // the day. Default 3h (e.g. Nov 1 submissions become allocatable Nov 2
    // 03:00 challenge-local time); configurable per challenge (no UI yet,
    // same as dailyProcessingCapacity). See the Slice B allocation-cutoff
    // proposal.
    processingGracePeriodHours: integer("processing_grace_period_hours").notNull().default(3),
    // Resume point for the discovery engine's "continue phase" (deep
    // pagination) — null means no sweep is currently in progress. Set to
    // the next page's `after` cursor whenever a sync's time/page budget
    // runs out mid-sweep; cleared back to null when the sweep either
    // reaches the true end of pagination or hits an expired/invalid
    // cursor (both cases fall through to "start a fresh deep sweep" on the
    // next sync — see lib/discovery.ts). Never used to decide where the
    // "refresh phase" (always page 1, every sync) starts.
    discoveryCursor: text("discovery_cursor"),
    // When the continue phase last reached the true end of pagination
    // (Meta returned no further cursor) — null means either never swept,
    // or a new sweep is currently in progress (deliberately cleared back
    // to null the moment a new sweep starts, so an interrupted new sweep
    // doesn't look falsely "completed" from the previous one). A sync more
    // than DEEP_SWEEP_INTERVAL_HOURS (lib/discovery.ts) after this
    // timestamp starts a new deep sweep.
    discoverySweepCompletedAt: timestamp("discovery_sweep_completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("challenge_organization_id_idx").on(table.organizationId),
    check("challenge_daily_processing_capacity_nonneg", sql`${table.dailyProcessingCapacity} IS NULL OR ${table.dailyProcessingCapacity} >= 0`),
    check("challenge_grace_period_nonneg", sql`${table.processingGracePeriodHours} >= 0`),
  ]
);

export const challengeRelations = relations(challenge, ({ one }) => ({
  organization: one(organization, {
    fields: [challenge.organizationId],
    references: [organization.id],
  }),
}));
