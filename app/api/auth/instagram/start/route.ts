import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Newer "Instagram API with Instagram Login" path — no Facebook Page required.
 * Scopes below are the current (2025/2026-era) names; re-verify against the
 * live Instagram Login product page before each test, Meta renames these.
 */
const SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_messages",
  "instagram_business_manage_comments",
  "instagram_business_content_publish",
].join(",");

export async function GET(req: NextRequest) {
  const appId = process.env.INSTAGRAM_APP_ID;
  const baseUrl = process.env.BASE_URL;

  if (!appId || !baseUrl) {
    return NextResponse.json(
      { error: "Missing INSTAGRAM_APP_ID or BASE_URL env var" },
      { status: 500 }
    );
  }

  const redirectUri = `${baseUrl}/api/auth/instagram/callback`;
  const authorizeUrl = new URL("https://www.instagram.com/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", appId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", SCOPES);

  return NextResponse.redirect(authorizeUrl.toString());
}
