import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Legacy "Facebook Login + Instagram Graph API" path — requires a Facebook
 * Page linked to the organizer's Instagram professional account.
 *
 * Uses Facebook Login for Business via a pre-created Configuration (config_id),
 * not the classic scope= param — classic Facebook Login rejects instagram_basic/
 * pages_show_list/pages_read_engagement outright ("Invalid Scopes"). The
 * Configuration (General variant, User access token type) was created in the
 * App Dashboard with instagram_basic, instagram_manage_comments, pages_show_list,
 * pages_read_engagement selected. See SPIKE-RESULTS.md Section 1b for the full
 * setup trail.
 */
const FACEBOOK_LOGIN_CONFIG_ID = "1107651082267490";

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
  authorizeUrl.searchParams.set("config_id", FACEBOOK_LOGIN_CONFIG_ID);

  return NextResponse.redirect(authorizeUrl.toString());
}
