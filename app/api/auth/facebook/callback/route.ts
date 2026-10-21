import { NextRequest, NextResponse } from "next/server";
import { logEvent } from "@/lib/logger";
import { FACEBOOK_OAUTH_STATE_COOKIE, finalizeCallbackResponse, verifyOAuthState } from "@/lib/oauth";

export const runtime = "nodejs";

const GRAPH_API_VERSION = "v21.0";

export async function GET(req: NextRequest) {
  const start = Date.now();
  const code = req.nextUrl.searchParams.get("code");
  const errorParam = req.nextUrl.searchParams.get("error");
  const stateParam = req.nextUrl.searchParams.get("state");
  const expectedState = req.cookies.get(FACEBOOK_OAUTH_STATE_COOKIE)?.value;

  // Verify CSRF state before anything else — reject missing, mismatched, or
  // expired (cookie no longer present) state regardless of whether this is
  // an error or success callback.
  if (!verifyOAuthState(expectedState, stateParam)) {
    await logEvent({
      testCaseId: "auth.facebook_login.invalid_state",
      endpoint: "/api/auth/facebook/callback",
      method: "GET",
      status: "error",
      response: { error: "invalid_state" },
      result: "FAIL",
    });
    return finalizeCallbackResponse(
      NextResponse.json({ error: "Invalid or expired state" }, { status: 400 }),
      FACEBOOK_OAUTH_STATE_COOKIE
    );
  }

  if (errorParam) {
    await logEvent({
      testCaseId: "auth.facebook_login.callback",
      endpoint: "/api/auth/facebook/callback",
      method: "GET",
      status: "error",
      response: { error: errorParam },
      result: "FAIL",
    });
    return finalizeCallbackResponse(
      NextResponse.json({ error: errorParam }, { status: 400 }),
      FACEBOOK_OAUTH_STATE_COOKIE
    );
  }

  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  const baseUrl = process.env.BASE_URL;
  if (!code || !appId || !appSecret || !baseUrl) {
    return finalizeCallbackResponse(
      NextResponse.json({ error: "Missing code or app env vars" }, { status: 400 }),
      FACEBOOK_OAUTH_STATE_COOKIE
    );
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
    return finalizeCallbackResponse(
      NextResponse.json({ step: "code_exchange", token }, { status: 502 }),
      FACEBOOK_OAUTH_STATE_COOKIE
    );
  }

  // Step 1.5: list permissions actually granted on this token — diagnostic for
  // the empty-pages mystery (is pages_show_list genuinely granted or not?).
  const permsStart = Date.now();
  const permsUrl = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/me/permissions`);
  permsUrl.searchParams.set("access_token", token.access_token);
  const permsRes = await fetch(permsUrl.toString());
  const permissions = await permsRes.json();

  await logEvent({
    testCaseId: "auth.facebook_login.list_permissions",
    endpoint: `https://graph.facebook.com/${GRAPH_API_VERSION}/me/permissions`,
    method: "GET",
    apiVersion: GRAPH_API_VERSION,
    status: permsRes.status,
    response: permissions,
    result: permsRes.ok ? "PASS" : "FAIL",
    latencyMs: Date.now() - permsStart,
  });

  // Step 2: list Facebook Pages this user manages, to test the Page dependency.
  // Explicitly scope `fields` so Meta never sends back the per-page access_token
  // it includes by default — we don't need it, and it's a real secret.
  const pagesStart = Date.now();
  const pagesUrl = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/me/accounts`);
  pagesUrl.searchParams.set("fields", "id,name,category,tasks");
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

  // Step 2.5 fallback: /me/accounts omits Pages owned by a Business Portfolio
  // even with business_management granted (known Graph API behavior since
  // v18 — see SPIKE-RESULTS.md Section 1b). If /me/accounts came back empty,
  // list the user's businesses and pull each one's owned Pages directly,
  // requesting instagram_business_account in the same call.
  let businessOwnedPages: any[] = [];
  let businesses: unknown = null;
  if (!pages?.data?.length) {
    const bizStart = Date.now();
    const bizUrl = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/me/businesses`);
    bizUrl.searchParams.set("access_token", token.access_token);
    const bizRes = await fetch(bizUrl.toString());
    businesses = await bizRes.json();

    await logEvent({
      testCaseId: "auth.facebook_login.list_businesses",
      endpoint: `https://graph.facebook.com/${GRAPH_API_VERSION}/me/businesses`,
      method: "GET",
      apiVersion: GRAPH_API_VERSION,
      status: bizRes.status,
      response: businesses,
      result: bizRes.ok ? "PASS" : "FAIL",
      latencyMs: Date.now() - bizStart,
    });

    for (const business of (businesses as any)?.data ?? []) {
      for (const edge of ["owned_pages", "client_pages"]) {
        const ownedStart = Date.now();
        const ownedUrl = new URL(
          `https://graph.facebook.com/${GRAPH_API_VERSION}/${business.id}/${edge}`
        );
        ownedUrl.searchParams.set("fields", "id,name,instagram_business_account");
        ownedUrl.searchParams.set("access_token", token.access_token);
        const ownedRes = await fetch(ownedUrl.toString());
        const ownedJson = await ownedRes.json();

        await logEvent({
          testCaseId: `auth.facebook_login.business_${edge}`,
          endpoint: `https://graph.facebook.com/${GRAPH_API_VERSION}/{business-id}/${edge}`,
          method: "GET",
          apiVersion: GRAPH_API_VERSION,
          params: { fields: "id,name,instagram_business_account" },
          accountIds: { businessId: business.id },
          status: ownedRes.status,
          response: ownedJson,
          result: ownedRes.ok ? "PASS" : "FAIL",
          latencyMs: Date.now() - ownedStart,
        });

        businessOwnedPages.push(...(ownedJson?.data ?? []).map((p: any) => ({ ...p, _edge: edge })));
      }
    }
  }

  // Step 3: for each Page from /me/accounts, check for a linked Instagram
  // Business Account (owned_pages above already includes it inline).
  const pageIgLinks: unknown[] = businessOwnedPages.map((page) => ({
    pageId: page.id,
    pageName: page.name,
    instagram_business_account: page.instagram_business_account,
    source: `business_${page._edge}`,
  }));

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

    pageIgLinks.push({ pageId: page.id, pageName: page.name, source: "me_accounts", ...igJson });
  }

  // Raw tokens are never included in this response, in any environment.
  // Obtain FACEBOOK_ORGANIZER_ACCESS_TOKEN by running this flow against a
  // local dev server (BASE_URL=http://localhost:... in .env.local) instead,
  // and copy the token from there directly into Vercel's env var UI.
  const safe = {
    success: true,
    tokenType: token?.token_type ?? null,
    expiresInSeconds: token?.expires_in ?? null,
    accessTokenLength: token?.access_token?.length ?? null,
    accessTokenPrefix: token?.access_token ? token.access_token.slice(0, 4) : null,
  };

  return finalizeCallbackResponse(
    NextResponse.json({
      note: "Raw tokens are not returned by this endpoint. Retrieve FACEBOOK_ORGANIZER_ACCESS_TOKEN by running this OAuth flow against a local dev server instead.",
      ...safe,
      grantedPermissions: permissions?.data,
      pages: pages?.data,
      businesses: (businesses as any)?.data,
      businessOwnedPages,
      pageIgLinks,
    }),
    FACEBOOK_OAUTH_STATE_COOKIE
  );
}
