import { and, desc, eq, lt, ne, or, sql, type SQL } from "drizzle-orm";
import type { AppDb } from "@/lib/db/client";
import { submission } from "@/lib/db/schema";
import { getChallenge } from "@/lib/challenge";
import { isGraceElapsed } from "@/lib/timezone";

/** Pilot-scale fixed page sizes — no UI for changing these. */
export const GALLERY_PAGE_SIZE = 48;
export const DIAGNOSTICS_PAGE_SIZE = 50;

export interface SubmissionCardData {
  id: string;
  mediaId: string;
  permalink: string | null;
  caption: string | null;
  mediaType: string | null;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  creatorUsername: string | null;
  publishedAt: Date;
  reviewStatus: "unreviewed" | "selected" | "rejected";
  processingStatus: "pending" | "completed" | "error_permanent";
  // Real (not fabricated) data for the shared lightbox's eligibility
  // checklist — UX-A fidelity requirement, previously missing from this type.
  mentionResult: "verified" | "not_verified" | null;
  dateEligible: boolean;
}

const CARD_COLUMNS = {
  id: submission.id,
  mediaId: submission.mediaId,
  permalink: submission.permalink,
  caption: submission.caption,
  mediaType: submission.mediaType,
  mediaUrl: submission.mediaUrl,
  thumbnailUrl: submission.thumbnailUrl,
  creatorUsername: submission.creatorUsername,
  publishedAt: submission.publishedAt,
  reviewStatus: submission.reviewStatus,
  processingStatus: submission.processingStatus,
  mentionResult: submission.mentionResult,
  dateEligible: submission.dateEligible,
} as const;

interface Cursor {
  publishedAt: string;
  id: string;
}

function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeCursor(raw: string): Cursor | null {
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (parsed && typeof parsed.publishedAt === "string" && typeof parsed.id === "string") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Keyset condition for stable (publishedAt DESC, id DESC) pagination: the
 * next page is every row strictly "after" the cursor in that same tuple
 * ordering — publishedAt earlier, or an exact tie broken by a lexicographically
 * smaller id. Offset pagination was avoided deliberately: it re-scans and
 * re-skips everything before the current page on every request, and a
 * concurrent insert/update between pages can shift row positions and
 * duplicate or skip items. Keyset pagination has neither problem — the only
 * way back is the previous page's own last-id state.
 */
function keysetCondition(cursor: Cursor): SQL {
  const cursorDate = new Date(cursor.publishedAt);
  return or(
    lt(submission.publishedAt, cursorDate),
    and(eq(submission.publishedAt, cursorDate), lt(submission.id, cursor.id))
  )!;
}

async function fetchPage(db: AppDb, conditions: SQL[], pageSize: number, cursor: Cursor | null) {
  const where = cursor ? and(...conditions, keysetCondition(cursor)) : and(...conditions);
  const rows = await db
    .select(CARD_COLUMNS)
    .from(submission)
    .where(where)
    .orderBy(desc(submission.publishedAt), desc(submission.id))
    .limit(pageSize + 1);

  const hasMore = rows.length > pageSize;
  const items = hasMore ? rows.slice(0, pageSize) : rows;
  const last = items[items.length - 1];
  const nextCursor = hasMore && last ? encodeCursor({ publishedAt: last.publishedAt.toISOString(), id: last.id }) : null;
  return { items, nextCursor };
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export type GalleryPageResult =
  | { outcome: "ok"; items: SubmissionCardData[]; nextCursor: string | null }
  | { outcome: "not_found" }
  | { outcome: "invalid_cursor" }
  | { outcome: "invalid_day" };

/**
 * "Ready" tab for one challenge-local day: admitted into that day's stable
 * review sample (sampledForReview=true) and not manually rejected.
 * Rejected items move to the Set-aside view (getDiagnosticSubmissions,
 * category "rejected") instead of disappearing or staying here — Undo
 * (setSubmissionReviewStatus back to "unreviewed") is what brings them back.
 * Never loads the full day's sample into memory — one bounded page per
 * call, server-side cursor pagination only.
 */
export async function getGallerySubmissions(
  db: AppDb,
  organizationId: string,
  challengeId: string,
  day: string,
  cursorRaw: string | null
): Promise<GalleryPageResult> {
  if (!DAY_RE.test(day)) return { outcome: "invalid_day" };
  const challenge = await getChallenge(db, organizationId, challengeId);
  if (!challenge) return { outcome: "not_found" };

  let cursor: Cursor | null = null;
  if (cursorRaw) {
    cursor = decodeCursor(cursorRaw);
    if (!cursor) return { outcome: "invalid_cursor" };
  }

  const { items, nextCursor } = await fetchPage(
    db,
    [
      eq(submission.challengeId, challengeId),
      eq(submission.challengeLocalDay, day),
      eq(submission.sampledForReview, true),
      ne(submission.reviewStatus, "rejected"),
    ],
    GALLERY_PAGE_SIZE,
    cursor
  );
  return { outcome: "ok", items, nextCursor };
}

export const DIAGNOSTIC_CATEGORIES = ["pending", "technical_failure", "not_verified", "outside_dates", "rejected"] as const;
export type DiagnosticCategory = (typeof DIAGNOSTIC_CATEGORIES)[number];

/**
 * Mutually-exclusive precedence (first match wins). The first four
 * categories are automatic exclusions; "rejected" is the curator's own
 * manual decision on an otherwise-gallery-eligible, already-sampled item —
 * kept as a distinguishable 5th reason rather than merged into the other
 * four, since its origin (a person, not a rule) is exactly what the
 * Set-aside view needs to show (UX-A locked decision #5). A completed,
 * verified, date-eligible row that is NOT rejected falls through to NULL
 * and is excluded here regardless of whether it's been sampled yet —
 * that's either the Ready tab (getGallerySubmissions, if sampled) or the
 * count-only "eligible but not yet sampled" bucket (getNotYetSampledCount,
 * if not), never a diagnostics row.
 */
const CATEGORY_CASE = sql`
  CASE
    WHEN ${submission.processingStatus} = 'pending' THEN 'pending'
    WHEN ${submission.processingStatus} = 'error_permanent' THEN 'technical_failure'
    WHEN ${submission.processingStatus} = 'completed' AND ${submission.mentionResult} IS DISTINCT FROM 'verified' THEN 'not_verified'
    WHEN ${submission.processingStatus} = 'completed' AND ${submission.mentionResult} = 'verified' AND ${submission.dateEligible} = false THEN 'outside_dates'
    WHEN ${submission.processingStatus} = 'completed' AND ${submission.mentionResult} = 'verified' AND ${submission.dateEligible} = true AND ${submission.reviewStatus} = 'rejected' THEN 'rejected'
  END
`;

export type DiagnosticSummaryResult =
  | { outcome: "ok"; counts: Record<DiagnosticCategory, number> }
  | { outcome: "not_found" }
  | { outcome: "invalid_day" };

export const EMPTY_DIAGNOSTIC_COUNTS: Record<DiagnosticCategory, number> = {
  pending: 0,
  technical_failure: 0,
  not_verified: 0,
  outside_dates: 0,
  rejected: 0,
};

/** Cheap aggregate counts for one challenge-local day — always safe to compute immediately, independent of whether the section is expanded. */
export async function getDiagnosticSummary(db: AppDb, organizationId: string, challengeId: string, day: string): Promise<DiagnosticSummaryResult> {
  if (!DAY_RE.test(day)) return { outcome: "invalid_day" };
  const challenge = await getChallenge(db, organizationId, challengeId);
  if (!challenge) return { outcome: "not_found" };

  const rows = await db
    .select({ category: CATEGORY_CASE.as("category"), count: sql<number>`count(*)::int` })
    .from(submission)
    .where(and(eq(submission.challengeId, challengeId), eq(submission.challengeLocalDay, day)))
    .groupBy(CATEGORY_CASE);

  const counts: Record<DiagnosticCategory, number> = { ...EMPTY_DIAGNOSTIC_COUNTS };
  for (const row of rows) {
    const category = row.category as string | null;
    if (category && (DIAGNOSTIC_CATEGORIES as readonly string[]).includes(category)) {
      counts[category as DiagnosticCategory] = Number(row.count);
    }
  }
  return { outcome: "ok", counts };
}

export type DiagnosticPageResult =
  | { outcome: "ok"; items: SubmissionCardData[]; nextCursor: string | null }
  | { outcome: "not_found" }
  | { outcome: "invalid_cursor" }
  | { outcome: "invalid_day" };

/** Fetched lazily by the caller (only once a category is actually expanded) — never bundled into the summary call. Read-only: no review controls, no reviewStatus mutation anywhere in this path. */
export async function getDiagnosticSubmissions(
  db: AppDb,
  organizationId: string,
  challengeId: string,
  day: string,
  category: DiagnosticCategory,
  cursorRaw: string | null
): Promise<DiagnosticPageResult> {
  if (!DAY_RE.test(day)) return { outcome: "invalid_day" };
  const challenge = await getChallenge(db, organizationId, challengeId);
  if (!challenge) return { outcome: "not_found" };

  let cursor: Cursor | null = null;
  if (cursorRaw) {
    cursor = decodeCursor(cursorRaw);
    if (!cursor) return { outcome: "invalid_cursor" };
  }

  const { items, nextCursor } = await fetchPage(
    db,
    [eq(submission.challengeId, challengeId), eq(submission.challengeLocalDay, day), sql`${CATEGORY_CASE} = ${category}`],
    DIAGNOSTICS_PAGE_SIZE,
    cursor
  );
  return { outcome: "ok", items, nextCursor };
}

export type SelectedSubmissionsResult =
  | { outcome: "ok"; items: SubmissionCardData[] }
  | { outcome: "not_found" }
  | { outcome: "invalid_day" };

/**
 * The tray: every selected item for one challenge-local day, with no
 * pagination and no silent truncation (UX-A locked decision #6) — bounded
 * naturally by dailyReviewLimit (max 500), so loading the full set in one
 * call is safe at this scale. sampledForReview=true is redundant with
 * reviewStatus='selected' in practice (selection only ever happens on an
 * already-sampled item) but kept explicit so this query's intent doesn't
 * depend on that invariant holding elsewhere.
 */
export async function getSelectedSubmissions(db: AppDb, organizationId: string, challengeId: string, day: string): Promise<SelectedSubmissionsResult> {
  if (!DAY_RE.test(day)) return { outcome: "invalid_day" };
  const challenge = await getChallenge(db, organizationId, challengeId);
  if (!challenge) return { outcome: "not_found" };

  const items = await db
    .select(CARD_COLUMNS)
    .from(submission)
    .where(
      and(
        eq(submission.challengeId, challengeId),
        eq(submission.challengeLocalDay, day),
        eq(submission.sampledForReview, true),
        eq(submission.reviewStatus, "selected")
      )
    )
    .orderBy(desc(submission.publishedAt), desc(submission.id));
  return { outcome: "ok", items };
}

export interface DayStats {
  discovered: number;
  completed: number;
  eligible: number;
  sampled: number;
  selected: number;
}

export type DayStatsResult = { outcome: "ok"; stats: DayStats } | { outcome: "not_found" } | { outcome: "invalid_day" };

/** Transparent, honest per-day counts (UX-A locked decision #4) — only counts rows actually discovered/processed, never a claim about the true total population under the hashtag. */
export async function getDayStats(db: AppDb, organizationId: string, challengeId: string, day: string): Promise<DayStatsResult> {
  if (!DAY_RE.test(day)) return { outcome: "invalid_day" };
  const challenge = await getChallenge(db, organizationId, challengeId);
  if (!challenge) return { outcome: "not_found" };

  const rows = await db
    .select({
      processingStatus: submission.processingStatus,
      mentionResult: submission.mentionResult,
      dateEligible: submission.dateEligible,
      sampledForReview: submission.sampledForReview,
      reviewStatus: submission.reviewStatus,
    })
    .from(submission)
    .where(and(eq(submission.challengeId, challengeId), eq(submission.challengeLocalDay, day)));

  let completed = 0;
  let eligible = 0;
  let sampled = 0;
  let selected = 0;
  for (const row of rows) {
    if (row.processingStatus === "completed") completed++;
    if (row.processingStatus === "completed" && row.mentionResult === "verified" && row.dateEligible) eligible++;
    if (row.sampledForReview) sampled++;
    if (row.reviewStatus === "selected") selected++;
  }

  return { outcome: "ok", stats: { discovered: rows.length, completed, eligible, sampled, selected } };
}

export type NotYetSampledCountResult = { outcome: "ok"; count: number } | { outcome: "not_found" } | { outcome: "invalid_day" };

/**
 * "Eligible but not yet sampled" — a count only, never a browsable gallery
 * (UX-A locked decision #4: this is inline explanatory text, not a second
 * list the curator can page through). Rows here will become Ready-tab
 * items on a future sync's admission pass once dailyReviewLimit allows,
 * never by this function or anything in the request path mutating them.
 */
export async function getNotYetSampledCount(db: AppDb, organizationId: string, challengeId: string, day: string): Promise<NotYetSampledCountResult> {
  if (!DAY_RE.test(day)) return { outcome: "invalid_day" };
  const challenge = await getChallenge(db, organizationId, challengeId);
  if (!challenge) return { outcome: "not_found" };

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(submission)
    .where(
      and(
        eq(submission.challengeId, challengeId),
        eq(submission.challengeLocalDay, day),
        eq(submission.processingStatus, "completed"),
        eq(submission.mentionResult, "verified"),
        eq(submission.dateEligible, true),
        eq(submission.sampledForReview, false)
      )
    );
  return { outcome: "ok", count };
}

export interface ChallengeDay {
  day: string;
  /** Whether this day's grace period has elapsed — an un-elapsed day has no review pool yet (UX-A locked decision #1), so the day switcher must show it as unavailable rather than silently empty. */
  graceElapsed: boolean;
}

export type ChallengeDaysResult = { outcome: "ok"; days: ChallengeDay[] } | { outcome: "not_found" };

/** Powers the day switcher — every challenge-local day that has at least one submission, most recent first. */
export async function listChallengeDays(db: AppDb, organizationId: string, challengeId: string): Promise<ChallengeDaysResult> {
  const challenge = await getChallenge(db, organizationId, challengeId);
  if (!challenge) return { outcome: "not_found" };

  const rows = await db
    .selectDistinct({ day: submission.challengeLocalDay })
    .from(submission)
    .where(eq(submission.challengeId, challengeId))
    .orderBy(desc(submission.challengeLocalDay));

  const days = rows.map((r) => ({
    day: r.day,
    graceElapsed: isGraceElapsed(r.day, challenge.timezone, challenge.processingGracePeriodHours),
  }));
  return { outcome: "ok", days };
}

/** The day a caller should land on when none is specified: the most recent grace-elapsed day, or null if none has cleared grace yet. */
export function pickDefaultDay(days: ChallengeDay[]): string | null {
  return days.find((d) => d.graceElapsed)?.day ?? null;
}

export type ResolveDayResult = { outcome: "ok"; day: string } | { outcome: "no_day_available" } | { outcome: "not_found" } | { outcome: "invalid_day" };

/**
 * Shared by every day-scoped route: an explicit `?day=` is used as-is
 * (format-validated, not existence-validated — a day with zero submissions
 * is a legitimate, just-empty result, not an error); omitted, it resolves
 * to the latest grace-elapsed day. "no_day_available" means the challenge
 * has no grace-elapsed day yet — distinct from "not_found" (bad
 * challengeId/workspace) and from a valid day that's simply empty.
 */
export async function resolveDay(db: AppDb, organizationId: string, challengeId: string, requestedDay: string | null): Promise<ResolveDayResult> {
  if (requestedDay) {
    if (!DAY_RE.test(requestedDay)) return { outcome: "invalid_day" };
    const challenge = await getChallenge(db, organizationId, challengeId);
    if (!challenge) return { outcome: "not_found" };
    return { outcome: "ok", day: requestedDay };
  }

  const result = await listChallengeDays(db, organizationId, challengeId);
  if (result.outcome === "not_found") return { outcome: "not_found" };
  const day = pickDefaultDay(result.days);
  return day ? { outcome: "ok", day } : { outcome: "no_day_available" };
}
