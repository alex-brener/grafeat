/**
 * Baseline security headers, applied to every route.
 *
 * CSP notes (see MERGE-ASSESSMENT.md for the full compatibility writeup):
 * - `script-src 'unsafe-inline'` is required because Next.js's App Router
 *   injects inline bootstrap/hydration <script> tags; removing it would
 *   need nonce-based CSP via middleware.ts, which this baseline patch does
 *   not add.
 * - `script-src 'unsafe-eval'` is added ONLY in development (never in a
 *   production build/NODE_ENV). Next's dev-mode React Fast Refresh runtime
 *   (@next/react-refresh-utils) evaluates code via `eval()` to apply hot
 *   updates; without 'unsafe-eval' the browser throws an uncaught EvalError
 *   while executing main-app.js, which aborts that script before React
 *   finishes hydrating — every interactive element on the page silently
 *   stops responding to clicks, with no error specific to any one
 *   component. Production bundles don't use eval-based HMR, so this
 *   relaxation never applies there — the production CSP is unchanged.
 * - `style-src 'unsafe-inline'` is required because this app renders most
 *   of its UI (notably the ported Challenge Curator product) with React
 *   inline `style={{...}}` objects, which compile to inline `style="..."`
 *   HTML attributes.
 * - `font-src 'self'` is sufficient — all fonts are self-hosted under
 *   app/fonts/ (next/font/local), no external font host is used.
 * - No external script/image/connect hosts are used anywhere in the app,
 *   so everything else can stay 'self'-only.
 *
 * Referrer-Policy is split by path rather than set once for `/:path*`:
 * Next.js's config-level `headers()` takes precedence over a header a route
 * handler sets on its own NextResponse for the same key (verified against a
 * production build — the route handler's own value was silently overridden
 * when a single blanket rule was used). Since every /api/* route already
 * benefits from the stricter policy, not just the two OAuth callbacks, /api/*
 * gets `no-referrer` here directly — matching, not fighting, what
 * lib/oauth.ts#finalizeCallbackResponse sets. Cache-Control has no global
 * rule at all, so the callbacks' own `no-store` is untouched by this file.
 */
const isDev = process.env.NODE_ENV !== "production";

const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const BASE_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  { key: "Content-Security-Policy", value: CSP },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Every API route — includes, but isn't limited to, the OAuth
        // callbacks, which also set this directly on their own response.
        source: "/api/:path*",
        headers: [...BASE_HEADERS, { key: "Referrer-Policy", value: "no-referrer" }],
      },
      {
        // Everything else (marketing/legal pages, /dev, /robots.txt).
        source: "/((?!api/).*)",
        headers: [...BASE_HEADERS, { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }],
      },
    ];
  },
};

export default nextConfig;
