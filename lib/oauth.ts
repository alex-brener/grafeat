import { randomBytes, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

/**
 * Shared OAuth CSRF-state and response-hardening helpers for the Facebook
 * Login and Instagram Login flows (app/api/auth/{facebook,instagram}/*).
 *
 * State cookies are short-lived (10 min — long enough to complete Meta's
 * consent screen, short enough to limit replay window), HttpOnly (not
 * readable by page JS), Secure outside local dev, and SameSite=Lax (sent on
 * the top-level redirect back from Meta, but not on cross-site POSTs/fetches).
 */

const STATE_MAX_AGE_SECONDS = 600;

export const FACEBOOK_OAUTH_STATE_COOKIE = "fb_oauth_state";
export const INSTAGRAM_OAUTH_STATE_COOKIE = "ig_oauth_state";

function stateCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

/** A cryptographically random, unguessable CSRF state token. */
export function generateOAuthState(): string {
  return randomBytes(32).toString("hex");
}

/** Sets the short-lived state cookie on the redirect-to-Meta response. */
export function setOAuthStateCookie(response: NextResponse, cookieName: string, state: string): void {
  response.cookies.set(cookieName, state, stateCookieOptions(STATE_MAX_AGE_SECONDS));
}

/** Expires the state cookie immediately — call on every callback exit path. */
export function clearOAuthStateCookie(response: NextResponse, cookieName: string): void {
  response.cookies.set(cookieName, "", stateCookieOptions(0));
}

/**
 * Constant-time comparison of the cookie-stored state against what Meta
 * echoed back in the callback query string. Missing, mismatched, or
 * length-different values are all rejected the same way (returns false,
 * never throws) — including the "cookie expired/absent" case, since an
 * expired state is indistinguishable from a missing one once the browser
 * stops sending it.
 */
export function verifyOAuthState(expected: string | undefined, received: string | null): boolean {
  if (!expected || !received) return false;
  const expectedBuf = Buffer.from(expected);
  const receivedBuf = Buffer.from(received);
  if (expectedBuf.length !== receivedBuf.length) return false;
  return timingSafeEqual(expectedBuf, receivedBuf);
}

/**
 * Applies to every OAuth callback response: clears the one-time state
 * cookie (success or failure), prevents any caching layer from storing a
 * response tied to a single-use authorization code, and suppresses the
 * Referer header on any outbound navigation from this page so a code
 * embedded in this page's own URL can't leak to a third party.
 */
export function finalizeCallbackResponse(response: NextResponse, cookieName: string): NextResponse {
  clearOAuthStateCookie(response, cookieName);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
