import { NextRequest, NextResponse } from "next/server";
import { logEvent } from "@/lib/logger";
import { FACEBOOK_OAUTH_STATE_COOKIE, finalizeCallbackResponse, verifyOAuthState } from "@/lib/oauth";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { consumeConnectIntent } from "@/lib/oauth-connect-intent";
import { assertWorkspaceMembership, ForbiddenError } from "@/lib/workspace";
import { upsertMetaConnection } from "@/lib/meta-connection";

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

  // Second, independent check: which workspace/user does this nonce actually
  // belong to? Never derived from the `state` value itself (attacker-visible
  // and attacker-replayable) — looked up server-side and consumed exactly
  // once. A missing/expired/already-used intent is rejected the same way a
  // bad CSRF state is, even though the cookie check above already passed.
  const db = getDb();
  const intent = stateParam ? await consumeConnectIntent(db, stateParam) : null;
  if (!intent || intent.provider !== "facebook_login") {
    await logEvent({
      testCaseId: "auth.facebook_login.invalid_intent",
      endpoint: "/api/auth/facebook/callback",
      method: "GET",
      status: "error",
      response: { error: "invalid_or_expired_connect_intent" },
      result: "FAIL",
    });
    return finalizeCallbackResponse(
      NextResponse.json({ error: "Connect session expired or already used. Please try connecting again." }, { status: 400 }),
      FACEBOOK_OAUTH_STATE_COOKIE
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
      FACEBOOK_OAUTH_STATE_COOKIE
    );
  }
  try {
    await assertWorkspaceMembership(db, session.user.id, intent.organizationId);
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return finalizeCallbackResponse(
        NextResponse.json({ error: "Not authorized for this workspace" }, { status: 403 }),
        FACEBOOK_OAUTH_STATE_COOKIE
      );
    }
    throw e;
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
        // Field expansion requests username alongside the id in one call
        // (confirmed field name via Meta's IG User reference, Slice A.1) —
        // no separate request needed.
        ownedUrl.searchParams.set("fields", "id,name,instagram_business_account{id,username}");
        ownedUrl.searchParams.set("access_token", token.access_token);
        const ownedRes = await fetch(ownedUrl.toString());
        const ownedJson = await ownedRes.json();

        await logEvent({
          testCaseId: `auth.facebook_login.business_${edge}`,
          endpoint: `https://graph.facebook.com/${GRAPH_API_VERSION}/{business-id}/${edge}`,
          method: "GET",
          apiVersion: GRAPH_API_VERSION,
          params: { fields: "id,name,instagram_business_account{id,username}" },
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
    igUrl.searchParams.set("fields", "instagram_business_account{id,username}");
    igUrl.searchParams.set("access_token", token.access_token);
    const igStart = Date.now();
    const igRes = await fetch(igUrl.toString());
    const igJson = await igRes.json();

    await logEvent({
      testCaseId: "auth.facebook_login.page_ig_link",
      endpoint: `https://graph.facebook.com/${GRAPH_API_VERSION}/{page-id}`,
      method: "GET",
      apiVersion: GRAPH_API_VERSION,
      params: { fields: "instagram_business_account{id,username}" },
      status: igRes.status,
      response: igJson,
      accountIds: { pageId: page.id },
      result: igRes.ok ? "PASS" : "FAIL",
      latencyMs: Date.now() - igStart,
    });

    pageIgLinks.push({ pageId: page.id, pageName: page.name, source: "me_accounts", ...igJson });
  }

  // Resolve the linked Instagram Business Account ID from whichever path
  // found it (direct /me/accounts page, or the Business-Portfolio fallback).
  // This is the graph.facebook.com-namespaced IG id (SPIKE-RESULTS.md §3.1) —
  // not interchangeable with the Instagram Login flow's igUserId.
  const resolvedAccount = pageIgLinks
    .map((link: any) => link?.instagram_business_account)
    .find((account: unknown): account is { id: string; username?: string } => typeof (account as any)?.id === "string");
  const resolvedIgId = resolvedAccount?.id;
  const resolvedUsername: string | null = typeof resolvedAccount?.username === "string" ? resolvedAccount.username : null;

  if (!token?.access_token || !resolvedIgId) {
    return finalizeCallbackResponse(
      NextResponse.redirect(new URL("/dashboard?connectError=facebook_login_no_ig_account", req.url)),
      FACEBOOK_OAUTH_STATE_COOKIE
    );
  }

  await upsertMetaConnection(db, {
    organizationId: intent.organizationId,
    provider: "facebook_login",
    igUserId: resolvedIgId,
    username: resolvedUsername,
    accessToken: token.access_token,
    tokenExpiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
  });

  return finalizeCallbackResponse(
    NextResponse.redirect(new URL("/dashboard?connected=facebook_login", req.url)),
    FACEBOOK_OAUTH_STATE_COOKIE
  );
}
