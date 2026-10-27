/**
 * Thin Facebook-Login Graph API client for Slice B discovery/verification.
 * Deliberately injected as an interface (MetaGraphClient) rather than called
 * directly from lib/discovery.ts/lib/processing.ts — lets tests substitute a
 * fake implementation instead of hitting the network, without needing a
 * mocking framework.
 *
 * Error classification (classifyGraphError) is best-effort against Meta's
 * documented/commonly-observed Graph API error codes. One case is now
 * [CONFIRMED LIVE] against the real API (2026-10-27, @the_calligrail +
 * #grafeattest2026): mentioned_media.media_id(...) signals "not mentioned"
 * as an HTTP 400/code 10/OAuthException, not a clean 200 — see the
 * "not_mentioned" kind below. Rate-limit, token-expiry, and deleted-media
 * responses remain unverified against this app; unrecognized shapes
 * deliberately fall back to "transient" rather than "permanent," since a
 * wrong permanent classification would incorrectly give up on a candidate
 * forever.
 */

const GRAPH_API_VERSION = "v21.0";
const GRAPH_HOST = "https://graph.facebook.com";

export type MetaErrorKind =
  | "token_invalid"
  | "permissions"
  | "rate_limited"
  | "cursor_invalid"
  | "not_mentioned"
  | "transient"
  | "unknown";

export class MetaGraphError extends Error {
  kind: MetaErrorKind;
  status: number;
  retryAfterSeconds: number | null;
  /** Never the raw Graph error body — sanitized message only, safe for sync_run.lastError. */
  constructor(message: string, kind: MetaErrorKind, status: number, retryAfterSeconds: number | null = null) {
    super(message);
    this.kind = kind;
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

interface GraphErrorBody {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
  };
}

const RATE_LIMIT_CODES = new Set([4, 17, 32, 613]);

function classifyGraphError(status: number, body: GraphErrorBody, retryAfterHeader: string | null): MetaGraphError {
  const err = body?.error;
  const code = err?.code;
  const message = err?.message ?? `Graph API error (HTTP ${status})`;
  const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) || null : null;

  if (status === 401 || code === 190) {
    return new MetaGraphError("The organizer's Facebook connection has expired or was revoked.", "token_invalid", status, retryAfterSeconds);
  }
  if (status === 429 || (code !== undefined && RATE_LIMIT_CODES.has(code))) {
    return new MetaGraphError("Meta rate-limited this request.", "rate_limited", status, retryAfterSeconds);
  }
  // [CONFIRMED LIVE, 2026-10-27] Meta's mentioned_media.media_id(...) field
  // expansion signals "this media does not mention the organizer" as an
  // HTTP 400, code 10, OAuthException, with this exact message — not a
  // clean 200 with an empty object (that was an untested assumption; see
  // fetchMentionedMedia's own fallback handling for the still-unverified
  // 200-shaped case). Must be checked before the generic code-10
  // permissions bucket below, or every ordinary non-mention gets
  // misclassified as a connection-breaking permissions failure.
  if (code === 10 && /not mentioned in the caption/i.test(message)) {
    return new MetaGraphError(message, "not_mentioned", status, retryAfterSeconds);
  }
  // Permissions: Meta's own docs list code 10 ("permission denied") and a
  // handful of OAuthException subcodes for missing scopes — treated as
  // permissions rather than token_invalid since the fix is different
  // (re-grant a scope vs. reconnect entirely).
  if (code === 10 || (err?.type === "OAuthException" && code !== 190)) {
    return new MetaGraphError("Missing a required Instagram/Facebook permission.", "permissions", status, retryAfterSeconds);
  }
  // Heuristic only — Meta doesn't document a dedicated "cursor expired"
  // code; code 100 ("Invalid parameter") with a cursor-shaped message is
  // the best signal available without having observed a real one yet.
  if (code === 100 && /cursor/i.test(message)) {
    return new MetaGraphError("Pagination cursor is no longer valid.", "cursor_invalid", status, retryAfterSeconds);
  }
  // A 503/502/etc can legitimately carry its own Retry-After too — carried
  // through so a per-submission transient failure can honor it the same
  // way a rate-limited one does (see lib/processing.ts).
  if (status >= 500 || status === 0) {
    return new MetaGraphError("Meta API or network error.", "transient", status, retryAfterSeconds);
  }
  return new MetaGraphError(message.slice(0, 200), "unknown", status, retryAfterSeconds);
}

async function graphGet<T>(url: URL): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url.toString());
  } catch {
    throw new MetaGraphError("Network error calling the Meta Graph API.", "transient", 0);
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw classifyGraphError(res.status, json as GraphErrorBody, res.headers.get("retry-after"));
  }
  return json as T;
}

export interface RecentMediaItem {
  id: string;
  caption?: string;
  media_type?: string;
  permalink?: string;
  timestamp: string;
}

export interface RecentMediaPage {
  items: RecentMediaItem[];
  /** Opaque cursor to pass as `after` for the next page — null if this was the last page. */
  nextAfter: string | null;
}

export interface VerifiedMentionData {
  username: string | null;
  caption: string | null;
  mediaType: string | null;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  permalink: string | null;
}

export type MentionedMediaResult =
  | { outcome: "verified"; data: VerifiedMentionData }
  | { outcome: "not_mentioned" }
  | { outcome: "inaccessible" };

export interface MetaGraphClient {
  searchHashtag(igUserId: string, hashtag: string): Promise<string>;
  fetchRecentMedia(igUserId: string, hashtagId: string, after?: string | null): Promise<RecentMediaPage>;
  fetchMentionedMedia(igUserId: string, mediaId: string): Promise<MentionedMediaResult>;
}

export function createMetaGraphClient(accessToken: string): MetaGraphClient {
  return {
    async searchHashtag(igUserId, hashtag) {
      const url = new URL(`${GRAPH_HOST}/${GRAPH_API_VERSION}/ig_hashtag_search`);
      url.searchParams.set("user_id", igUserId);
      url.searchParams.set("q", hashtag);
      url.searchParams.set("access_token", accessToken);
      const json = await graphGet<{ data?: { id: string }[] }>(url);
      const id = json.data?.[0]?.id;
      if (!id) throw new MetaGraphError(`No hashtag found for "${hashtag}".`, "unknown", 404);
      return id;
    },

    async fetchRecentMedia(igUserId, hashtagId, after) {
      const url = new URL(`${GRAPH_HOST}/${GRAPH_API_VERSION}/${hashtagId}/recent_media`);
      url.searchParams.set("user_id", igUserId);
      url.searchParams.set("fields", "id,caption,media_type,permalink,timestamp");
      url.searchParams.set("limit", "50");
      if (after) url.searchParams.set("after", after);
      url.searchParams.set("access_token", accessToken);
      const json = await graphGet<{ data?: RecentMediaItem[]; paging?: { cursors?: { after?: string }; next?: string } }>(url);
      return {
        items: json.data ?? [],
        // `next` (not just `cursors.after`) being present is the documented
        // signal that another page actually exists — some edges return a
        // cursors.after value even on the final page.
        nextAfter: json.paging?.next ? json.paging.cursors?.after ?? null : null,
      };
    },

    async fetchMentionedMedia(igUserId, mediaId) {
      const url = new URL(`${GRAPH_HOST}/${GRAPH_API_VERSION}/${igUserId}`);
      const field = `mentioned_media.media_id(${mediaId}){username,caption,media_type,media_url,thumbnail_url,permalink}`;
      url.searchParams.set("fields", field);
      url.searchParams.set("access_token", accessToken);

      let json: Record<string, unknown>;
      try {
        json = await graphGet<Record<string, unknown>>(url);
      } catch (err) {
        // [CONFIRMED LIVE] "not mentioned" arrives as a thrown error, not a
        // 200 — translated back into a normal outcome here so callers
        // (lib/processing.ts) never see it as a failure of any kind.
        if (err instanceof MetaGraphError && err.kind === "not_mentioned") return { outcome: "not_mentioned" };
        throw err;
      }

      const mentioned = json.mentioned_media as Record<string, unknown> | undefined;
      // Still unverified (flagged in the module doc comment): whether a
      // genuinely deleted/inaccessible media comes back this way (200,
      // empty/error-shaped field) rather than as its own thrown error
      // hasn't been observed yet — kept as a defensive fallback.
      if (!mentioned || typeof mentioned !== "object" || "error" in mentioned) {
        return { outcome: "inaccessible" };
      }
      if (Object.keys(mentioned).length === 0) {
        return { outcome: "not_mentioned" };
      }
      const data = mentioned as Record<string, unknown>;
      return {
        outcome: "verified",
        data: {
          username: typeof data.username === "string" ? data.username : null,
          caption: typeof data.caption === "string" ? data.caption : null,
          mediaType: typeof data.media_type === "string" ? data.media_type : null,
          mediaUrl: typeof data.media_url === "string" ? data.media_url : null,
          thumbnailUrl: typeof data.thumbnail_url === "string" ? data.thumbnail_url : null,
          permalink: typeof data.permalink === "string" ? data.permalink : null,
        },
      };
    },
  };
}
