import { NextRequest, NextResponse } from "next/server";
import { INSTAGRAM_OAUTH_STATE_COOKIE, generateOAuthState, setOAuthStateCookie } from "@/lib/oauth";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { createConnectIntent } from "@/lib/oauth-connect-intent";

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

  // This connect flow attaches a Meta identity to a workspace, so it must
  // run as an authenticated Grafeat user with an active workspace — not an
  // anonymous visitor. The callback never trusts anything Meta echoes back
  // for *which* workspace to attach to; that correlation is established
  // here, server-side, before the redirect to Meta even happens.
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.session.activeOrganizationId) {
    return NextResponse.redirect(new URL("/login?next=/dashboard", req.url));
  }

  const redirectUri = `${baseUrl}/api/auth/instagram/callback`;

  // CSRF protection: a random, unguessable value stored in a short-lived
  // HttpOnly cookie and echoed back by Meta in the callback's `state` param.
  // The callback rejects any request whose state doesn't match this cookie.
  const state = generateOAuthState();

  await createConnectIntent(getDb(), {
    nonce: state,
    userId: session.user.id,
    organizationId: session.session.activeOrganizationId,
    provider: "instagram_login",
  });

  const authorizeUrl = new URL("https://www.instagram.com/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", appId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", SCOPES);
  authorizeUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authorizeUrl.toString());
  setOAuthStateCookie(response, INSTAGRAM_OAUTH_STATE_COOKIE, state);
  return response;
}
