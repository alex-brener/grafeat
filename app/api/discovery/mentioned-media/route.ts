import { NextRequest, NextResponse } from "next/server";
import { logEvent, saveFixture } from "@/lib/logger";

export const runtime = "nodejs";

const GRAPH_API_VERSION = "v21.0";

/**
 * Section 3.1 retrieval-only probe, decoupled from webhook discovery. Tests
 * whether the documented mentioned_media edge actually works at all, given a
 * known media ID (e.g. a historical #callivember post confirmed to caption-
 * mention @the_calligrail, from the /tags dump in SPIKE-RESULTS.md Section
 * 3.2 Test C). This isolates "does retrieval work" from "does discovery
 * (webhook) work" — Tests C and D both showed no webhook delivery for a
 * caption-only mention on either login path, so this checks the other half
 * of the documented chain independently.
 *
 * Host: graph.facebook.com — this edge is only documented for Facebook Login
 * tokens (see SPIKE-RESULTS.md Section 3.1 documentation audit), so this
 * requires the Facebook-Login-issued token, not the Instagram Login one.
 * Required permissions per Meta's own mentioned_media reference page:
 * instagram_basic, instagram_manage_comments, pages_read_engagement.
 */
export async function GET(req: NextRequest) {
  // Note: this is the Facebook-Graph-API-scoped IG user ID, a different
  // value from ORGANIZER_IG_USER_ID (which is Instagram-Login-scoped — same
  // underlying account, two different ID namespaces across Meta's two auth
  // products). See SPIKE-RESULTS.md Section 3.1 for how this was discovered.
  const igUserId =
    req.nextUrl.searchParams.get("igUserId") ?? process.env.FACEBOOK_ORGANIZER_IG_USER_ID;
  const accessToken =
    req.nextUrl.searchParams.get("accessToken") ?? process.env.FACEBOOK_ORGANIZER_ACCESS_TOKEN;
  const mediaId = req.nextUrl.searchParams.get("mediaId");

  const diagnostics = {
    igUserIdPresent: !!igUserId,
    igUserIdValue: igUserId ?? null,
    accessTokenPresent: !!accessToken,
    accessTokenLength: accessToken?.length ?? 0,
    accessTokenPrefix: accessToken ? accessToken.slice(0, 4) : null,
    mediaIdPresent: !!mediaId,
    mediaIdValue: mediaId ?? null,
  };

  if (!igUserId || !accessToken || !mediaId) {
    return NextResponse.json(
      {
        error:
          "Missing igUserId/accessToken/mediaId (query params, or ORGANIZER_IG_USER_ID/FACEBOOK_ORGANIZER_ACCESS_TOKEN env — mediaId has no env fallback, always pass it explicitly)",
        diagnostics,
      },
      { status: 400 }
    );
  }

  const start = Date.now();
  const url = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/${igUserId}`);
  const fields = `mentioned_media.media_id(${mediaId}){caption,media_type,media_url,permalink,timestamp,username,comments_count,like_count,owner}`;
  url.searchParams.set("fields", fields);
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url.toString());
  const json = await res.json();
  const fixturePath = await saveFixture("discovery-mentioned-media", json);

  await logEvent({
    testCaseId: "discovery.mentioned_media.retrieve",
    endpoint: `https://graph.facebook.com/${GRAPH_API_VERSION}/{ig-user-id}?fields=mentioned_media.media_id({media-id})`,
    method: "GET",
    apiVersion: GRAPH_API_VERSION,
    accountIds: { igUserId },
    mediaId,
    status: res.status,
    response: json,
    result: res.ok ? "PASS" : "FAIL",
    notes: `saved to ${fixturePath}`,
    latencyMs: Date.now() - start,
  });

  return NextResponse.json({ status: res.status, body: json, diagnostics });
}
