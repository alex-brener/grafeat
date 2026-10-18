import { NextRequest, NextResponse } from "next/server";
import { logEvent } from "@/lib/logger";

export const runtime = "nodejs";

const GRAPH_API_VERSION = "v21.0";

export async function GET(req: NextRequest) {
  const start = Date.now();
  const code = req.nextUrl.searchParams.get("code");
  const errorParam = req.nextUrl.searchParams.get("error");

  if (errorParam) {
    await logEvent({
      testCaseId: "auth.facebook_login.callback",
      endpoint: "/api/auth/facebook/callback",
      method: "GET",
      status: "error",
      response: { error: errorParam },
      result: "FAIL",
    });
    return NextResponse.json({ error: errorParam }, { status: 400 });
  }

  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  const baseUrl = process.env.BASE_URL;
  if (!code || !appId || !appSecret || !baseUrl) {
    return NextResponse.json({ error: "Missing code or app env vars" }, { status: 400 });
  }

  const redirectUri = `${baseUrl}/api/auth/facebook/callback`;

  // Step 1: exchange code for a user access token.
  const tokenUrl = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token`);
  tokenUrl.searchParams.set("client_id", appId);
  tokenUrl.searchParams.set("client_secret", appSecret);
  tokenUrl.searchParams.set("redirect_uri", redirectUri);
  tokenUrl.searchParams.set("code", code);

  const tokenRes = await fetch(tokenUrl.toString());
  const token = await tokenRes.json();

  await logEvent({
    testCaseId: "auth.facebook_login.exchange_code",
    endpoint: `https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token`,
    method: "GET",
    apiVersion: GRAPH_API_VERSION,
    status: tokenRes.status,
    response: token,
    result: tokenRes.ok ? "PASS" : "FAIL",
    latencyMs: Date.now() - start,
  });

  if (!tokenRes.ok) {
    return NextResponse.json({ step: "code_exchange", token }, { status: 502 });
  }

  // Step 2: list Facebook Pages this user manages, to test the Page dependency.
  const pagesStart = Date.now();
  const pagesUrl = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/me/accounts`);
  pagesUrl.searchParams.set("access_token", token.access_token);
  const pagesRes = await fetch(pagesUrl.toString());
  const pages = await pagesRes.json();

  await logEvent({
    testCaseId: "auth.facebook_login.list_pages",
    endpoint: `https://graph.facebook.com/${GRAPH_API_VERSION}/me/accounts`,
    method: "GET",
    apiVersion: GRAPH_API_VERSION,
    status: pagesRes.status,
    response: pages,
    result: pagesRes.ok ? "PASS" : "FAIL",
    latencyMs: Date.now() - pagesStart,
  });

  // Step 3: for each Page, check for a linked Instagram Business Account.
  const pageIgLinks: unknown[] = [];
  for (const page of pages?.data ?? []) {
    const igUrl = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/${page.id}`);
    igUrl.searchParams.set("fields", "instagram_business_account");
    igUrl.searchParams.set("access_token", token.access_token);
    const igStart = Date.now();
    const igRes = await fetch(igUrl.toString());
    const igJson = await igRes.json();

    await logEvent({
      testCaseId: "auth.facebook_login.page_ig_link",
      endpoint: `https://graph.facebook.com/${GRAPH_API_VERSION}/{page-id}`,
      method: "GET",
      apiVersion: GRAPH_API_VERSION,
      params: { fields: "instagram_business_account" },
      status: igRes.status,
      response: igJson,
      accountIds: { pageId: page.id },
      result: igRes.ok ? "PASS" : "FAIL",
      latencyMs: Date.now() - igStart,
    });

    pageIgLinks.push({ pageId: page.id, pageName: page.name, ...igJson });
  }

  // Same reasoning as the Instagram Login callback: Meta's redirect only
  // carries `code`, so reveal has to be an env var the user flips deliberately.
  const reveal = process.env.DIAGNOSTIC_REVEAL_TOKENS === "true";

  const safe = {
    success: true,
    tokenType: token?.token_type ?? null,
    expiresInSeconds: token?.expires_in ?? null,
    accessTokenLength: token?.access_token?.length ?? null,
    accessTokenPrefix: token?.access_token ? token.access_token.slice(0, 4) : null,
  };

  return NextResponse.json({
    note: reveal
      ? "DIAGNOSTIC_REVEAL_TOKENS=true — raw token included below. Copy into env vars, then unset that flag and redeploy."
      : "Token is not rendered by default. Set DIAGNOSTIC_REVEAL_TOKENS=true in Vercel env vars, redeploy, and re-run this flow once to retrieve it.",
    ...safe,
    pages: pages?.data,
    pageIgLinks,
    ...(reveal ? { rawAccessToken: token.access_token } : {}),
  });
}
