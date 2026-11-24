"use client";

/**
 * The landing page is statically generated at build time — a server-only
 * `new Date().getFullYear()` would freeze at the last deploy instead of
 * actually staying current. Computing it client-side at render time keeps
 * it genuinely accurate regardless of build staleness. `suppressHydrationWarning`
 * is the standard, minimal pattern for a value that's allowed to legitimately
 * differ between server and client (the rare case of a build made in one
 * calendar year, viewed after the next one starts) — it's the content, not
 * a bug, so there's nothing to warn about.
 */
export function CopyrightYear() {
  return <span suppressHydrationWarning>{new Date().getFullYear()}</span>;
}
