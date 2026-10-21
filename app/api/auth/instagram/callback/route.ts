import { NextRequest, NextResponse } from "next/server";
import { logEvent } from "@/lib/logger";
import { INSTAGRAM_OAUTH_STATE_COOKIE, finalizeCallbackResponse, verifyOAuthState } from "@/lib/oauth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const start = Date.now();
  const code = req.nextUrl.searchParams.get("code");
  const errorParam = req.nextUrl.searchParams.get("error");
  const stateParam = req.nextUrl.searchParams.get("state");
  const expectedState = req.cookies.get(INSTAGRAM_OAUTH_STATE_COOKIE)?.value;

  // Verify CSRF state before anything else — reject missing, mismatched, or
  // expired (cookie no longer present) state regardless of whether this is
  // an error or success callback.
  if (!verifyOAuthState(expectedState, stateParam)) {
    await logEvent({
      testCaseId: "auth.instagram_login.invalid_state",
      endpoint: "/api/auth/instagram/callback",
      method: "GET",
      status: "error",
      response: { error: "invalid_state" },
      result: "FAIL",
    });
    return finalizeCallbackResponse(
      NextResponse.json({ error: "Invalid or expired state" }, { status: 400 }),
      INSTAGRAM_OAUTH_STATE_COOKIE
    );
  }

  if (errorParam) {
    await logEvent({
      testCaseId: "auth.instagram_login.callback",
      endpoint: "/api/auth/instagram/callback",
      method: "GET",
      status: "error",
      response: { error: errorParam },
      result: "FAIL",
    });
    return finalizeCallbackResponse(
      NextResponse.json({ error: errorParam }, { status: 400 }),
      INSTAGRAM_OAUTH_STATE_COOKIE
    );
  }

  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  const baseUrl = process.env.BASE_URL;
  if (!code || !appId || !appSecret || !baseUrl) {
    return finalizeCallbackResponse(
      NextResponse.json({ error: "Missing code or app env vars" }, { status: 400 }),
      INSTAGRAM_OAUTH_STATE_COOKIE
    );
  }

  const redirectUri = `${baseUrl}/api/auth/instagram/callback`;

  // Step 1: exchange the authorization code for a short-lived token.
  const tokenForm = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  });

  const shortLivedRes = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenForm,
  });
  const shortLived = await shortLivedRes.json();

  await logEvent({
    testCaseId: "auth.instagram_login.exchange_code",
    endpoint: "https://api.instagram.com/oauth/access_token",
    method: "POST",
    params: { grant_type: "authorization_code" },
    status: shortLivedRes.status,
    response: shortLived,
    accountIds: { instagramUserId: shortLived?.user_id },
    result: shortLivedRes.ok ? "PASS" : "FAIL",
    latencyMs: Date.now() - start,
  });

  if (!shortLivedRes.ok) {
    return finalizeCallbackResponse(
      NextResponse.json({ step: "short_lived_exchange", shortLived }, { status: 502 }),
      INSTAGRAM_OAUTH_STATE_COOKIE
    );
  }

  // Step 2: exchange short-lived for a long-lived token, to test lifetime/refresh behavior.
  const longLivedUrl = new URL("https://graph.instagram.com/access_token");
  longLivedUrl.searchParams.set("grant_type", "ig_exchange_token");
  longLivedUrl.searchParams.set("client_secret", appSecret);
  longLivedUrl.searchParams.set("access_token", shortLived.access_token);

  const longLivedStart = Date.now();
  const longLivedRes = await fetch(longLivedUrl.toString());
  const longLived = await longLivedRes.json();

  await logEvent({
    testCaseId: "auth.instagram_login.exchange_long_lived",
    endpoint: "https://graph.instagram.com/access_token",
    method: "GET",
    params: { grant_type: "ig_exchange_token" },
    status: longLivedRes.status,
    response: longLived,
    result: longLivedRes.ok ? "PASS" : "FAIL",
    latencyMs: Date.now() - longLivedStart,
  });

  // Raw tokens are never included in this response, in any environment.
  // Obtain ORGANIZER_ACCESS_TOKEN by running this flow against a local dev
  // server (BASE_URL=http://localhost:... in .env.local) instead, and copy
  // the token from there directly into Vercel's env var UI.
  const safe = {
    success: true,
    instagramUserId: shortLived?.user_id,
    permissionsRequested: shortLived?.permissions ?? null,
    tokenType: longLived?.token_type ?? null,
    expiresInSeconds: longLived?.expires_in ?? null,
    accessTokenLength: longLived?.access_token?.length ?? null,
    accessTokenPrefix: longLived?.access_token ? longLived.access_token.slice(0, 4) : null,
  };

  return finalizeCallbackResponse(
    NextResponse.json({
      note: "Raw tokens are not returned by this endpoint. Retrieve ORGANIZER_ACCESS_TOKEN by running this OAuth flow against a local dev server instead.",
      ...safe,
    }),
    INSTAGRAM_OAUTH_STATE_COOKIE
  );
}
