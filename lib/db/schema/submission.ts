import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  date,
  doublePrecision,
  pgEnum,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { challenge } from "./challenge";

// Lifecycle of a processing *attempt* — deliberately separate from its
// outcome (mentionResult below). There is NO stored "retryable error"
// state: a transient failure (network blip, 429, momentary Meta error)
// leaves the row in `pending` — exactly the state the allocation engine's
// `WHERE processing_status = 'pending'` query already selects from, so a
// retry needs no special-casing. `retryCount`/`lastAttemptedAt` below
// track how many times a pending row has been attempted, for backoff and
// for eventually giving up (promoting to `error_permanent`) after a capped
// number of failures. `completed` means the evaluation itself succeeded —
// covers both a genuine mention and a confirmed non-mention; either way a
// processing unit is consumed. `error_permanent` means Grafeat gave up on
// ever getting a usable answer for this candidate (media deleted,
// inaccessible, or the retry cap was exhausted) — a technical failure, NOT
// a successful evaluation, so it does NOT consume a unit (Slice B product
// rule: capacity is only spent on candidates that were actually
// evaluated). See the Slice B processing-allocation proposal for the full
// accounting rules and the atomic transition pattern.
export const processingStatusEnum = pgEnum("processing_status", ["pending", "completed", "error_permanent"]);
// Only meaningful once processingStatus = 'completed'.
export const mentionResultEnum = pgEnum("mention_result", ["verified", "not_verified"]);
// Deliberately independent of processing status/result — never conflate a
// failed/slow API call with a genuine negative verdict, and never let a
// sync overwrite a curator's manual decision.
export const reviewStatusEnum = pgEnum("review_status", ["unreviewed", "selected", "rejected"]);

export const submission = pgTable(
  "submission",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    challengeId: text("challenge_id")
      .notNull()
      .references(() => challenge.id, { onDelete: "cascade" }),
    mediaId: text("media_id").notNull(),
    permalink: text("permalink"),
    caption: text("caption"),
    // recent_media cannot return username (documented Meta field
    // limitation, already noted in app/api/discovery/hashtag-search). The
    // mention-verification field-expansion call is the only source of a
    // reliable username — this stays null until/unless a candidate is
    // actually verified.
    creatorUsername: text("creator_username"),
    // Best-effort, unconfirmed until the Slice B media-availability
    // experiment. Never assume permanence — Instagram media URLs expire.
    mediaType: text("media_type"),
    mediaUrl: text("media_url"),
    thumbnailUrl: text("thumbnail_url"),
    // Raw Instagram timestamp, preserved exactly as returned — never
    // mutated for eligibility comparison (lib/timezone.ts compares against
    // this, it doesn't rewrite it).
    publishedAt: timestamp("published_at").notNull(),
    // The challenge-local calendar date (lib/timezone.ts's
    // toZonedDateString) that publishedAt falls on in the challenge's own
    // timezone — stored rather than recomputed on every read, since it's
    // the bucketing key for processing_budget rows and the future
    // allocation engine's per-day candidate pool. Set once at discovery,
    // immutable afterward (publishedAt and challenge.timezone don't change).
    challengeLocalDay: date("challenge_local_day", { mode: "string" }).notNull(),
    // A stable, uniformly-random key assigned once at discovery (DB default
    // `random()`) and never recalculated. The future allocation engine
    // orders a day's backlog by this column instead of discovery/API order,
    // so processing isn't biased toward early posters — and because the
    // value never changes, re-running the ranking later can extend an
    // allocation without reshuffling who was already processed.
    allocationRank: doublePrecision("allocation_rank")
      .notNull()
      .default(sql`random()`),
    processingStatus: processingStatusEnum("processing_status").notNull().default("pending"),
    mentionResult: mentionResultEnum("mention_result"),
    // Set only on a terminal transition (-> completed or -> error_permanent).
    processingCheckedAt: timestamp("processing_checked_at"),
    // Set on every attempt, terminal or not — distinct from
    // processingCheckedAt so a repeatedly-failing `pending` row still shows
    // "last tried at X" without looking terminal. Used for retry backoff.
    lastAttemptedAt: timestamp("last_attempted_at"),
    // Set when a failure carried a Meta `Retry-After` hint — the backlog
    // query must not re-select this row before this instant, overriding
    // the generic retryCount-indexed backoff schedule for exactly that one
    // wait. Null means "no explicit hint, use the generic schedule."
    // Cleared back to null on the next attempt regardless of outcome, so a
    // stale hint can never outlive the failure that produced it.
    retryNotBeforeAt: timestamp("retry_not_before_at"),
    // How many processing attempts this submission has gone through —
    // observability + the cap the engine uses to eventually give up
    // (promote a persistently-failing pending row to error_permanent)
    // rather than retrying forever.
    retryCount: integer("retry_count").notNull().default(0),
    // Recomputed idempotently against the challenge's startDate/endDate/
    // timezone on every sync — cheap, so no separate "needs recompute" flag.
    // Independent of processingStatus: date eligibility is pure date math,
    // never requires a Meta call to determine.
    dateEligible: boolean("date_eligible").notNull().default(false),
    // The curator's decision. Sync upserts must never set this column —
    // only the explicit select/reject route touches it after initial insert.
    reviewStatus: reviewStatusEnum("review_status").notNull().default("unreviewed"),
    discoveredAt: timestamp("discovered_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    // DB-enforced dedup — not an application-level check. Scoped per
    // challenge (not globally), matching how media IDs are namespaced.
    uniqueIndex("submission_challenge_media_uidx").on(table.challengeId, table.mediaId),
    index("submission_challenge_id_idx").on(table.challengeId),
    // Gallery/eligibility ordering by true publish time.
    index("submission_challenge_published_idx").on(table.challengeId, table.publishedAt),
    // Per-day backlog/budget queries (processing_budget joins + allocation).
    index("submission_challenge_local_day_idx").on(table.challengeId, table.challengeLocalDay),
    // Backlog selection ("find pending rows for this challenge").
    index("submission_challenge_processing_status_idx").on(table.challengeId, table.processingStatus),
    check("submission_retry_count_nonneg", sql`${table.retryCount} >= 0`),
  ]
);

export const submissionRelations = relations(submission, ({ one }) => ({
  challenge: one(challenge, {
    fields: [submission.challengeId],
    references: [challenge.id],
  }),
}));
