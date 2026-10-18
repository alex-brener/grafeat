import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Legacy "Facebook Login + Instagram Graph API" path — requires a Facebook
 * Page linked to the organizer's Instagram professional account. Re-verify
 * scope names against the live Facebook Login product page before testing.
 */
const SCOPES = [
  "instagram_basic",
  "instagram_manage_comments",
  "pages_show_list",
  "pages_read_engagement",
].join(",");

const GRAPH_API_VERSION = "v21.0";

export async function GET(req: NextRequest) {
  const appId = process.env.FACEBOOK_APP_ID;
  const baseUrl = process.env.BASE_URL;

  if (!appId || !baseUrl) {
    return NextResponse.json(
      { error: "Missing FACEBOOK_APP_ID or BASE_URL env var" },
      { status: 500 }
    );
  }

  const redirectUri = `${baseUrl}/api/auth/facebook/callback`;
  const authorizeUrl = new URL(`https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth`);
  authorizeUrl.searchParams.set("client_id", appId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", SCOPES);

  return NextResponse.redirect(authorizeUrl.toString());
}
