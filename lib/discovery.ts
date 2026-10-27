import { and, eq } from "drizzle-orm";
import type { AppDb } from "@/lib/db/client";
import { challenge as challengeTable, submission } from "@/lib/db/schema";
import { isDateEligible, toZonedDateString } from "@/lib/timezone";
import { MetaGraphError, type MetaGraphClient, type RecentMediaItem } from "@/lib/meta-graph";

/** A sync's continue phase only starts a new deep sweep this long after the last one completed. Internal config — no UI/schema knob for Slice B. */
export const DEEP_SWEEP_INTERVAL_HOURS = 24;
/** Execution-budget bound (distinct from processing capacity) — refresh phase (1) + up to this many continue-phase pages per sync. */
const MAX_CONTINUE_PAGES_PER_RUN = 9;

export interface DiscoveryChallengeInput {
  id: string;
  hashtag: string;
  hashtagId: string | null;
  startDate: string;
  endDate: string;
  timezone: string;
  discoveryCursor: string | null;
  discoverySweepCompletedAt: Date | null;
}

export interface DiscoveryResult {
  pagesScanned: number;
  itemsScanned: number;
  newCandidates: number;
  existingCandidates: number;
  status: "completed" | "partial" | "error";
  errorMessage?: string;
  /** The cursor persisted to challenge.discoveryCursor at the end of this run — diagnostic only, mirrors sync_run.cursor. */
  finalCursor: string | null;
  /** Set only when a connection-wide rate limit stopped discovery — the earliest instant it's worth syncing again. */
  rateLimitedUntil?: Date;
}

/** Meta didn't supply a Retry-After header — a conservative guess, not a documented value. Mirrors lib/processing.ts's constant. */
const DEFAULT_RATE_LIMIT_BACKOFF_SECONDS = 60;

async function upsertDiscovered(
  db: AppDb,
  challenge: DiscoveryChallengeInput,
  items: RecentMediaItem[]
): Promise<{ newCount: number; existingCount: number }> {
  let newCount = 0;
  let existingCount = 0;
  for (const item of items) {
    const publishedAt = new Date(item.timestamp);
    const challengeLocalDay = toZonedDateString(publishedAt, challenge.timezone);
    const dateEligible = isDateEligible(publishedAt, challenge.startDate, challenge.endDate, challenge.timezone);

    // Two statements rather than one onConflictDoUpdate: a plain
    // ON CONFLICT DO NOTHING unambiguously reports whether this item was
    // new (returns a row) or already existed (returns none) — an
    // onConflictDoUpdate's RETURNING can't reliably distinguish the two
    // cases. The second statement then refreshes display/eligibility
    // fields unconditionally for both — never processingStatus,
    // reviewStatus, challengeLocalDay, or allocationRank, which must stay
    // exactly as first assigned.
    const inserted = await db
      .insert(submission)
      .values({
        challengeId: challenge.id,
        mediaId: item.id,
        permalink: item.permalink ?? null,
        caption: item.caption ?? null,
        mediaType: item.media_type ?? null,
        publishedAt,
        challengeLocalDay,
        dateEligible,
      })
      .onConflictDoNothing({ target: [submission.challengeId, submission.mediaId] })
      .returning({ id: submission.id });

    if (inserted.length > 0) {
      newCount++;
    } else {
      existingCount++;
      await db
        .update(submission)
        .set({ permalink: item.permalink ?? null, caption: item.caption ?? null, mediaType: item.media_type ?? null, dateEligible })
        .where(and(eq(submission.challengeId, challenge.id), eq(submission.mediaId, item.id)));
    }
  }
  return { newCount, existingCount };
}

function errorStatus(err: unknown): { status: "error"; message: string; rateLimitedUntil?: Date } {
  if (err instanceof MetaGraphError) {
    if (err.kind === "token_invalid" || err.kind === "permissions") throw err; // fatal — caller stops the whole sync
    return { status: "error", message: err.message, ...rateLimitPatch(err) };
  }
  return { status: "error", message: err instanceof Error ? err.message : "Unknown discovery error." };
}

function rateLimitPatch(err: MetaGraphError): { rateLimitedUntil?: Date } {
  if (err.kind !== "rate_limited") return {};
  return { rateLimitedUntil: new Date(Date.now() + (err.retryAfterSeconds ?? DEFAULT_RATE_LIMIT_BACKOFF_SECONDS) * 1000) };
}

/**
 * Runs one sync's discovery: a fixed-size "refresh phase" (always page 1,
 * every sync, to catch newly-posted content) followed by a "continue phase"
 * that resumes deep pagination from `challenge.discoveryCursor` — or starts
 * a fresh deep sweep from the refresh phase's own `after` cursor if no
 * sweep is in progress and either none has ever completed, or the last one
 * completed more than DEEP_SWEEP_INTERVAL_HOURS ago. See the Slice B
 * discovery-cursor proposal for the full state-transition rationale.
 *
 * Throws MetaGraphError for token_invalid/permissions — connection-wide
 * failures the caller (lib/sync.ts) must treat as fatal to the whole sync,
 * never as a per-item retry.
 */
export async function runDiscovery(
  db: AppDb,
  client: MetaGraphClient,
  igUserId: string,
  challenge: DiscoveryChallengeInput,
  deadline: number
): Promise<DiscoveryResult> {
  let pagesScanned = 0;
  let itemsScanned = 0;
  let newCandidates = 0;
  let existingCandidates = 0;

  let hashtagId = challenge.hashtagId;
  if (!hashtagId) {
    try {
      hashtagId = await client.searchHashtag(igUserId, challenge.hashtag);
    } catch (err) {
      return { pagesScanned, itemsScanned, newCandidates, existingCandidates, finalCursor: challenge.discoveryCursor, ...errorStatus(err) };
    }
    await db.update(challengeTable).set({ hashtagId }).where(eq(challengeTable.id, challenge.id));
  }

  let refreshPage;
  try {
    refreshPage = await client.fetchRecentMedia(igUserId, hashtagId);
  } catch (err) {
    return { pagesScanned, itemsScanned, newCandidates, existingCandidates, finalCursor: challenge.discoveryCursor, ...errorStatus(err) };
  }
  pagesScanned++;
  itemsScanned += refreshPage.items.length;
  const refreshUpsert = await upsertDiscovered(db, challenge, refreshPage.items);
  newCandidates += refreshUpsert.newCount;
  existingCandidates += refreshUpsert.existingCount;

  // Decide the continue phase's resume point (see module doc comment).
  let resumeCursor: string | null;
  let sweepCompletedAtToPersist = challenge.discoverySweepCompletedAt;
  let startingNewSweep = false;
  if (challenge.discoveryCursor) {
    resumeCursor = challenge.discoveryCursor;
  } else if (challenge.discoverySweepCompletedAt === null) {
    startingNewSweep = true;
    resumeCursor = refreshPage.nextAfter;
  } else if (Date.now() - challenge.discoverySweepCompletedAt.getTime() >= DEEP_SWEEP_INTERVAL_HOURS * 60 * 60 * 1000) {
    startingNewSweep = true;
    sweepCompletedAtToPersist = null; // mark "sweep in progress" immediately, so an interruption doesn't look falsely completed
    resumeCursor = refreshPage.nextAfter;
  } else {
    resumeCursor = null; // completed recently, not due for a re-sweep yet
  }

  // Capture resumeCursor as the point to persist even before any continue-
  // phase loop iteration runs (e.g. the time budget is already exhausted) —
  // otherwise that progress would be silently dropped.
  let cursorToPersist: string | null;
  if (resumeCursor !== null) {
    cursorToPersist = resumeCursor;
  } else if (startingNewSweep) {
    // refreshPage.nextAfter was itself null — the whole hashtag fits on one page, so the "sweep" is already complete.
    cursorToPersist = null;
    sweepCompletedAtToPersist = new Date();
  } else {
    cursorToPersist = challenge.discoveryCursor; // not due yet / untouched
  }

  let status: "completed" | "partial" | "error" = "completed";
  let errorMessage: string | undefined;
  let rateLimitedUntil: Date | undefined;

  try {
    let cursor = resumeCursor;
    while (cursor && pagesScanned < 1 + MAX_CONTINUE_PAGES_PER_RUN && Date.now() < deadline) {
      let page;
      try {
        page = await client.fetchRecentMedia(igUserId, hashtagId, cursor);
      } catch (err) {
        if (err instanceof MetaGraphError && err.kind === "cursor_invalid") {
          // Safe restart: forget the sweep entirely, next sync begins a fresh one from page 1.
          cursorToPersist = null;
          sweepCompletedAtToPersist = null;
          status = "partial";
          errorMessage = err.message;
          cursor = null;
          break;
        }
        throw err; // fatal (token/permissions) or non-fatal-but-stop-this-run (transient/rate_limited/unknown)
      }
      pagesScanned++;
      itemsScanned += page.items.length;
      const r = await upsertDiscovered(db, challenge, page.items);
      newCandidates += r.newCount;
      existingCandidates += r.existingCount;

      if (page.nextAfter === null) {
        cursorToPersist = null;
        sweepCompletedAtToPersist = new Date();
        cursor = null;
      } else {
        cursor = page.nextAfter;
        cursorToPersist = cursor;
      }
    }
    if (cursor !== null) status = "partial"; // loop exited on page/time budget, not completion
  } catch (err) {
    if (err instanceof MetaGraphError && (err.kind === "token_invalid" || err.kind === "permissions")) {
      await db
        .update(challengeTable)
        .set({ discoveryCursor: cursorToPersist, discoverySweepCompletedAt: sweepCompletedAtToPersist })
        .where(eq(challengeTable.id, challenge.id));
      throw err;
    }
    status = "partial";
    errorMessage = err instanceof Error ? err.message : "Discovery error.";
    if (err instanceof MetaGraphError) rateLimitedUntil = rateLimitPatch(err).rateLimitedUntil;
  }

  await db
    .update(challengeTable)
    .set({ discoveryCursor: cursorToPersist, discoverySweepCompletedAt: sweepCompletedAtToPersist })
    .where(eq(challengeTable.id, challenge.id));

  return { pagesScanned, itemsScanned, newCandidates, existingCandidates, status, errorMessage, finalCursor: cursorToPersist, rateLimitedUntil };
}
