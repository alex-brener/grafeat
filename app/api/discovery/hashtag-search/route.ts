import { NextRequest, NextResponse } from "next/server";
import { logEvent, saveFixture } from "@/lib/logger";

export const runtime = "nodejs";

const GRAPH_API_VERSION = "v21.0";

/**
 * Test E — Hashtag Discovery → Mention Resolution (Facebook Login only).
 * Tests whether poll-based discovery via a challenge hashtag can locate a
 * submission without relying on mention webhooks at all, as an alternative
 * to the unresolved caption-mention-webhook question (Tests C/D).
 *
 * Facebook-Login-only per Meta's docs — not available on Instagram Login.
 * Host: graph.facebook.com. Permissions: instagram_basic (+ pages_read_engagement
 * conditionally) — both already granted. Rate limit: 30 unique hashtags per
 * IG User per 7-day rolling window — pass `hashtag` explicitly each time,
 * deliberately no default, so this can't be called accidentally and burn quota.
 *
 * recent_media cannot return `username` by design (Meta's documented field
 * limitation) — that's expected, not a bug. Feed the resulting media `id`
 * into /api/discovery/mentioned-media to resolve the participant's username,
 * permalink, media_url, caption, and timestamp (step 5/6 of Test E).
 */
export async function GET(req: NextRequest) {
  const igUserId =
    req.nextUrl.searchParams.get("igUserId") ?? process.env.FACEBOOK_ORGANIZER_IG_USER_ID;
  const accessToken =
    req.nextUrl.searchParams.get("accessToken") ?? process.env.FACEBOOK_ORGANIZER_ACCESS_TOKEN;
  const hashtag = req.nextUrl.searchParams.get("hashtag");

  const diagnostics = {
    igUserIdPresent: !!igUserId,
    igUserIdValue: igUserId ?? null,
    accessTokenPresent: !!accessToken,
    accessTokenLength: accessToken?.length ?? 0,
    accessTokenPrefix: accessToken ? accessToken.slice(0, 4) : null,
    hashtagPresent: !!hashtag,
    hashtagValue: hashtag ?? null,
  };

  if (!igUserId || !accessToken || !hashtag) {
    return NextResponse.json(
      {
        error:
          "Missing igUserId/accessToken/hashtag (query params, or FACEBOOK_ORGANIZER_IG_USER_ID/FACEBOOK_ORGANIZER_ACCESS_TOKEN env — hashtag has no env fallback and no default, pass it explicitly: counts against the 30-per-7-days quota)",
        diagnostics,
      },
      { status: 400 }
    );
  }

  // Step 1: ig_hashtag_search — resolve the hashtag name to an IG Hashtag ID.
  const searchStart = Date.now();
  const searchUrl = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/ig_hashtag_search`);
  searchUrl.searchParams.set("user_id", igUserId);
  searchUrl.searchParams.set("q", hashtag);
  searchUrl.searchParams.set("access_token", accessToken);

  const searchRes = await fetch(searchUrl.toString());
  const searchJson = await searchRes.json();

  await logEvent({
    testCaseId: "discovery.hashtag_search.resolve",
    endpoint: `https://graph.facebook.com/${GRAPH_API_VERSION}/ig_hashtag_search`,
    method: "GET",
    apiVersion: GRAPH_API_VERSION,
    accountIds: { igUserId },
    params: { q: hashtag },
    status: searchRes.status,
    response: searchJson,
    result: searchRes.ok ? "PASS" : "FAIL",
    latencyMs: Date.now() - searchStart,
  });

  const hashtagId = searchJson?.data?.[0]?.id;
  if (!hashtagId) {
    return NextResponse.json(
      { step: "ig_hashtag_search", status: searchRes.status, body: searchJson, diagnostics },
      { status: searchRes.ok ? 404 : 502 }
    );
  }

  // Step 2: recent_media on the resolved hashtag ID. username is deliberately
  // not requested — Meta's docs say it cannot be returned on this edge.
  const mediaStart = Date.now();
  const mediaUrl = new URL(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${hashtagId}/recent_media`
  );
  mediaUrl.searchParams.set("user_id", igUserId);
  mediaUrl.searchParams.set(
    "fields",
    "id,caption,media_type,permalink,timestamp,like_count,comments_count"
  );
  mediaUrl.searchParams.set("access_token", accessToken);

  const mediaRes = await fetch(mediaUrl.toString());
  const mediaJson = await mediaRes.json();
  const fixturePath = await saveFixture("discovery-hashtag-recent-media", mediaJson);

  await logEvent({
    testCaseId: "discovery.hashtag_search.recent_media",
    endpoint: `https://graph.facebook.com/${GRAPH_API_VERSION}/{hashtag-id}/recent_media`,
    method: "GET",
    apiVersion: GRAPH_API_VERSION,
    accountIds: { igUserId, hashtagId },
    params: { fields: "id,caption,media_type,permalink,timestamp,like_count,comments_count" },
    status: mediaRes.status,
    response: mediaJson,
    result: mediaRes.ok ? "PASS" : "FAIL",
    notes: `saved to ${fixturePath}`,
    latencyMs: Date.now() - mediaStart,
  });

  return NextResponse.json({
    hashtagId,
    recentMedia: mediaJson?.data,
    note: "Take any media `id` above and call /api/discovery/mentioned-media?mediaId=<id> to resolve username/permalink/media_url/caption/timestamp (Test E steps 5-6).",
    diagnostics,
  });
}
