import { NextRequest, NextResponse } from "next/server";
import { logEvent } from "@/lib/logger";
import { INSTAGRAM_OAUTH_STATE_COOKIE, finalizeCallbackResponse, verifyOAuthState } from "@/lib/oauth";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { consumeConnectIntent } from "@/lib/oauth-connect-intent";
import { assertWorkspaceMembership, ForbiddenError } from "@/lib/workspace";
import { upsertMetaConnection } from "@/lib/meta-connection";

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

  // Second, independent check: which workspace/user does this nonce actually
  // belong to? Never derived from the `state` value itself (attacker-visible
  // and attacker-replayable) — looked up server-side and consumed exactly
  // once. A missing/expired/already-used intent is rejected the same way a
  // bad CSRF state is, even though the cookie check above already passed.
  const db = getDb();
  const intent = stateParam ? await consumeConnectIntent(db, stateParam) : null;
  if (!intent || intent.provider !== "instagram_login") {
    await logEvent({
      testCaseId: "auth.instagram_login.invalid_intent",
      endpoint: "/api/auth/instagram/callback",
      method: "GET",
      status: "error",
      response: { error: "invalid_or_expired_connect_intent" },
      result: "FAIL",
    });
    return finalizeCallbackResponse(
      NextResponse.json({ error: "Connect session expired or already used. Please try connecting again." }, { status: 400 }),
      INSTAGRAM_OAUTH_STATE_COOKIE
    );
  }

  // Lost/switched session between start and callback: require the same
  // authenticated user to still be signed in, and re-verify membership
  // directly rather than trusting the intent row alone (defense in depth —
  // never attach a connection to a workspace without an explicit, current
  // membership check).
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session || session.user.id !== intent.userId) {
    return finalizeCallbackResponse(
      NextResponse.redirect(new URL("/login?next=/dashboard&reason=session_lost", req.url)),
      INSTAGRAM_OAUTH_STATE_COOKIE
    );
  }
  try {
    await assertWorkspaceMembership(db, session.user.id, intent.organizationId);
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return finalizeCallbackResponse(
        NextResponse.json({ error: "Not authorized for this workspace" }, { status: 403 }),
        INSTAGRAM_OAUTH_STATE_COOKIE
      );
    }
    throw e;
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

  // Step 2: exchange short-lived for a long-lived (~60 day) token — this is what gets stored.
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

  if (!longLivedRes.ok || !longLived?.access_token || !shortLived?.user_id) {
    return finalizeCallbackResponse(
      NextResponse.redirect(new URL("/dashboard?connectError=instagram_login", req.url)),
      INSTAGRAM_OAUTH_STATE_COOKIE
    );
  }

  await upsertMetaConnection(db, {
    organizationId: intent.organizationId,
    provider: "instagram_login",
    igUserId: String(shortLived.user_id),
    accessToken: longLived.access_token,
    tokenExpiresAt: longLived.expires_in ? new Date(Date.now() + longLived.expires_in * 1000) : null,
  });

  return finalizeCallbackResponse(
    NextResponse.redirect(new URL("/dashboard?connected=instagram_login", req.url)),
    INSTAGRAM_OAUTH_STATE_COOKIE
  );
}
