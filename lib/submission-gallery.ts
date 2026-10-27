import { and, desc, eq, lt, or, sql, type SQL } from "drizzle-orm";
import type { AppDb } from "@/lib/db/client";
import { submission } from "@/lib/db/schema";
import { getChallenge } from "@/lib/challenge";

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

export type GalleryPageResult =
  | { outcome: "ok"; items: SubmissionCardData[]; nextCursor: string | null }
  | { outcome: "not_found" }
  | { outcome: "invalid_cursor" };

/**
 * Gallery = the set a curator should actually see: successfully evaluated,
 * a genuine mention, and inside the challenge's date window. Everything
 * else belongs in diagnostics (getDiagnosticSummary/getDiagnosticSubmissions
 * below), never here. Never loads the full eligible set into memory — one
 * bounded page per call, server-side cursor pagination only.
 */
export async function getGallerySubmissions(
  db: AppDb,
  organizationId: string,
  challengeId: string,
  cursorRaw: string | null
): Promise<GalleryPageResult> {
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
      eq(submission.processingStatus, "completed"),
      eq(submission.mentionResult, "verified"),
      eq(submission.dateEligible, true),
    ],
    GALLERY_PAGE_SIZE,
    cursor
  );
  return { outcome: "ok", items, nextCursor };
}

export const DIAGNOSTIC_CATEGORIES = ["pending", "technical_failure", "not_verified", "outside_dates"] as const;
export type DiagnosticCategory = (typeof DIAGNOSTIC_CATEGORIES)[number];

/**
 * Mutually-exclusive precedence (first match wins) over everything NOT in
 * the gallery. Processing status is checked before date eligibility
 * deliberately: a submission that hasn't been successfully evaluated yet
 * has a processing problem to report, not a date problem — date eligibility
 * only becomes the interesting fact once evaluation actually succeeded with
 * a genuine mention but the post still falls outside the challenge window.
 * Rows that are completed+verified+dateEligible (the gallery set) fall
 * through to NULL and are excluded from every diagnostics query below.
 */
const CATEGORY_CASE = sql`
  CASE
    WHEN ${submission.processingStatus} = 'pending' THEN 'pending'
    WHEN ${submission.processingStatus} = 'error_permanent' THEN 'technical_failure'
    WHEN ${submission.processingStatus} = 'completed' AND ${submission.mentionResult} IS DISTINCT FROM 'verified' THEN 'not_verified'
    WHEN ${submission.processingStatus} = 'completed' AND ${submission.mentionResult} = 'verified' AND ${submission.dateEligible} = false THEN 'outside_dates'
  END
`;

export type DiagnosticSummaryResult =
  | { outcome: "ok"; counts: Record<DiagnosticCategory, number> }
  | { outcome: "not_found" };

/** Cheap aggregate counts — always safe to compute immediately, independent of whether the section is expanded. */
export async function getDiagnosticSummary(db: AppDb, organizationId: string, challengeId: string): Promise<DiagnosticSummaryResult> {
  const challenge = await getChallenge(db, organizationId, challengeId);
  if (!challenge) return { outcome: "not_found" };

  const rows = await db
    .select({ category: CATEGORY_CASE.as("category"), count: sql<number>`count(*)::int` })
    .from(submission)
    .where(eq(submission.challengeId, challengeId))
    .groupBy(CATEGORY_CASE);

  const counts: Record<DiagnosticCategory, number> = { pending: 0, technical_failure: 0, not_verified: 0, outside_dates: 0 };
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
  | { outcome: "invalid_cursor" };

/** Fetched lazily by the caller (only once a category is actually expanded) — never bundled into the summary call. Read-only: no review controls, no reviewStatus mutation anywhere in this path. */
export async function getDiagnosticSubmissions(
  db: AppDb,
  organizationId: string,
  challengeId: string,
  category: DiagnosticCategory,
  cursorRaw: string | null
): Promise<DiagnosticPageResult> {
  const challenge = await getChallenge(db, organizationId, challengeId);
  if (!challenge) return { outcome: "not_found" };

  let cursor: Cursor | null = null;
  if (cursorRaw) {
    cursor = decodeCursor(cursorRaw);
    if (!cursor) return { outcome: "invalid_cursor" };
  }

  const { items, nextCursor } = await fetchPage(
    db,
    [eq(submission.challengeId, challengeId), sql`${CATEGORY_CASE} = ${category}`],
    DIAGNOSTICS_PAGE_SIZE,
    cursor
  );
  return { outcome: "ok", items, nextCursor };
}
