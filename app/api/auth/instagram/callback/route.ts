import { NextRequest, NextResponse } from "next/server";
import { logEvent } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const start = Date.now();
  const code = req.nextUrl.searchParams.get("code");
  const errorParam = req.nextUrl.searchParams.get("error");

  if (errorParam) {
    await logEvent({
      testCaseId: "auth.instagram_login.callback",
      endpoint: "/api/auth/instagram/callback",
      method: "GET",
      status: "error",
      response: { error: errorParam },
      result: "FAIL",
    });
    return NextResponse.json({ error: errorParam }, { status: 400 });
  }

  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  const baseUrl = process.env.BASE_URL;
  if (!code || !appId || !appSecret || !baseUrl) {
    return NextResponse.json({ error: "Missing code or app env vars" }, { status: 400 });
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
    return NextResponse.json({ step: "short_lived_exchange", shortLived }, { status: 502 });
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

  // Meta controls this redirect and only appends `code`/`error` — there's no
  // way for us to receive a per-request reveal flag from the query string.
  // Gate on an env var instead: set DIAGNOSTIC_REVEAL_TOKENS=true in Vercel
  // only while deliberately capturing a token, then unset it again.
  const reveal = process.env.DIAGNOSTIC_REVEAL_TOKENS === "true";

  const safe = {
    success: true,
    instagramUserId: shortLived?.user_id,
    permissionsRequested: shortLived?.permissions ?? null,
    tokenType: longLived?.token_type ?? null,
    expiresInSeconds: longLived?.expires_in ?? null,
    accessTokenLength: longLived?.access_token?.length ?? null,
    accessTokenPrefix: longLived?.access_token ? longLived.access_token.slice(0, 4) : null,
  };

  return NextResponse.json({
    note: reveal
      ? "DIAGNOSTIC_REVEAL_TOKENS=true — raw tokens included below. Copy into env vars, then unset that flag and redeploy."
      : "Tokens are not rendered by default. Set DIAGNOSTIC_REVEAL_TOKENS=true in Vercel env vars, redeploy, and re-run this flow once to retrieve them.",
    ...safe,
    ...(reveal
      ? { rawShortLivedToken: shortLived.access_token, rawLongLivedToken: longLived.access_token }
      : {}),
  });
}
