import { NextRequest, NextResponse } from "next/server";
import { logEvent, saveFixture } from "@/lib/logger";

export const runtime = "nodejs";

const GRAPH_API_VERSION = "v21.0";

/**
 * Section 3.3 polling/reconciliation probe. Hits the organizer IG user's
 * /tags edge as a candidate fallback to webhook-based mention discovery.
 *
 * Host: tokens minted by "Instagram API with Instagram Login" (what we used
 * for OAuth) are Instagram User tokens, scoped to graph.instagram.com — they
 * are NOT Facebook user/page tokens and graph.facebook.com cannot parse them
 * (that's the exact cause of the earlier "Cannot parse access token" / code
 * 190 error: the token and host belonged to two different auth products).
 * Per Meta's docs for this login product, /<IG_ID>/tags lives at
 * graph.instagram.com and requires instagram_business_basic +
 * instagram_business_manage_comments — both of which we have.
 * https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/mentions/
 *
 * Known limitation (from the same doc, worth recording for Section 3.2/3.3):
 * /tags only returns media where the account was UI-tagged, not caption
 * @mentions. There is no documented listing/polling edge for caption
 * mentions under either login product — discovery of those still depends on
 * the webhook delivering the media ID.
 *
 * Pass igUserId + accessToken as query params (manual test tool, not a
 * production endpoint) — never put real tokens in query strings outside
 * of this throwaway local testing use.
 */
export async function GET(req: NextRequest) {
  const igUserId = req.nextUrl.searchParams.get("igUserId") ?? process.env.ORGANIZER_IG_USER_ID;
  const accessToken =
    req.nextUrl.searchParams.get("accessToken") ?? process.env.ORGANIZER_ACCESS_TOKEN;

  const diagnostics = {
    igUserIdPresent: !!igUserId,
    igUserIdValue: igUserId ?? null,
    accessTokenPresent: !!accessToken,
    accessTokenLength: accessToken?.length ?? 0,
    accessTokenPrefix: accessToken ? accessToken.slice(0, 4) : null,
  };

  if (!igUserId || !accessToken) {
    return NextResponse.json(
      {
        error:
          "Missing igUserId/accessToken (query param or ORGANIZER_IG_USER_ID/ORGANIZER_ACCESS_TOKEN env)",
        diagnostics,
      },
      { status: 400 }
    );
  }

  const start = Date.now();
  const url = new URL(`https://graph.instagram.com/${GRAPH_API_VERSION}/${igUserId}/tags`);
  url.searchParams.set(
    "fields",
    "id,caption,media_type,media_url,permalink,timestamp,username"
  );
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url.toString());
  const json = await res.json();
  const fixturePath = await saveFixture("discovery-poll-tags", json);

  await logEvent({
    testCaseId: "discovery.poll.tags",
    endpoint: `https://graph.instagram.com/${GRAPH_API_VERSION}/{ig-user-id}/tags`,
    method: "GET",
    apiVersion: GRAPH_API_VERSION,
    accountIds: { igUserId },
    params: { accessTokenLength: diagnostics.accessTokenLength, accessTokenPrefix: diagnostics.accessTokenPrefix },
    status: res.status,
    response: json,
    result: res.ok ? "PASS" : "FAIL",
    notes: `saved to ${fixturePath}`,
    latencyMs: Date.now() - start,
  });

  return NextResponse.json({ status: res.status, body: json, diagnostics });
}
