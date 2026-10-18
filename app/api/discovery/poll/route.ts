import { NextRequest, NextResponse } from "next/server";
import { logEvent, saveFixture } from "@/lib/logger";

export const runtime = "nodejs";

const GRAPH_API_VERSION = "v21.0";

/**
 * Section 3.3 polling/reconciliation probe. Hits the organizer IG user's
 * /tags edge as a candidate fallback to webhook-based mention discovery.
 * Pass igUserId + accessToken as query params (manual test tool, not a
 * production endpoint) — never put real tokens in query strings outside
 * of this throwaway local testing use.
 */
export async function GET(req: NextRequest) {
  const igUserId = req.nextUrl.searchParams.get("igUserId") ?? process.env.ORGANIZER_IG_USER_ID;
  const accessToken =
    req.nextUrl.searchParams.get("accessToken") ?? process.env.ORGANIZER_ACCESS_TOKEN;

  if (!igUserId || !accessToken) {
    return NextResponse.json(
      { error: "Missing igUserId/accessToken (query param or ORGANIZER_IG_USER_ID/ORGANIZER_ACCESS_TOKEN env)" },
      { status: 400 }
    );
  }

  const start = Date.now();
  const url = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/${igUserId}/tags`);
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
    endpoint: `https://graph.facebook.com/${GRAPH_API_VERSION}/{ig-user-id}/tags`,
    method: "GET",
    apiVersion: GRAPH_API_VERSION,
    accountIds: { igUserId },
    status: res.status,
    response: json,
    result: res.ok ? "PASS" : "FAIL",
    notes: `saved to ${fixturePath}`,
    latencyMs: Date.now() - start,
  });

  return NextResponse.json({ status: res.status, body: json });
}
