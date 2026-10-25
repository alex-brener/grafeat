import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Self-hosted (next/font/local) rather than next/font/google: the Google
// loader fetches font metadata/files from fonts.googleapis.com at *build*
// time, which fails in some hosting build environments (see MERGE-ASSESSMENT.md
// for the root-cause writeup). These are the exact same Albert Sans /
// Instrument Serif files Google serves, fetched once and committed under
// app/fonts/ — build is now network-independent and deterministic.
const albertSans = localFont({
  src: [
    { path: "./fonts/albert-sans-latin.woff2", weight: "400", style: "normal" },
    { path: "./fonts/albert-sans-latin.woff2", weight: "500", style: "normal" },
    { path: "./fonts/albert-sans-latin.woff2", weight: "600", style: "normal" },
    { path: "./fonts/albert-sans-latin.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-albert-sans",
  display: "swap",
});

const instrumentSerif = localFont({
  src: [
    { path: "./fonts/instrument-serif-normal-latin.woff2", weight: "400", style: "normal" },
    { path: "./fonts/instrument-serif-italic-latin.woff2", weight: "400", style: "italic" },
  ],
  variable: "--font-instrument-serif",
  display: "swap",
});

// title/description/OG/Twitter copy is drawn verbatim from the Hero section's
// own eyebrow + lede (app/landing/Hero.tsx) rather than invented here, so the
// two stay in sync. The per-page titles already set on /privacy, /terms, and
// /data-deletion are full literal strings (e.g. "Privacy Policy — Grafeat"),
// not a template substitution — a Next `title.template` here would double
// that "— Grafeat" suffix on those pages, so this stays a plain default.
const SITE_TITLE = "Grafeat — For organizers of recurring Instagram art challenges";
const SITE_DESCRIPTION =
  "Grafeat collects your challenge submissions, checks the rules, prepares your carousel and keeps every credit in order.";

export const metadata: Metadata = {
  // Enables correctly-resolved absolute URLs for the Open Graph/Twitter
  // fields below. Falls back to undefined (Next just skips resolution) if
  // BASE_URL isn't set in this environment yet.
  metadataBase: process.env.BASE_URL ? new URL(process.env.BASE_URL) : undefined,
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: "Grafeat",
  keywords: [
    "Instagram art challenge",
    "Instagram challenge submissions",
    "Instagram carousel",
    "challenge curation",
  ],
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    siteName: "Grafeat",
    type: "website",
    locale: "en_US",
    // Image itself is NOT set here — app/opengraph-image.png (1200×630) is
    // Next's file-naming convention for this, auto-detected and injected
    // into both the og:image and (absent a separate twitter-image file)
    // twitter:image tags with no metadata-object wiring needed. Currently a
    // temporary/placeholder image; swap that file for final branding art
    // whenever it's ready — no code change required here.
  },
  twitter: {
    // summary_large_image, matching the opengraph-image.png convention
    // file above having a real image now.
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  // Matches --color-paper (app/globals.css) — tints mobile browser chrome
  // (e.g. Android Chrome's status bar) to the page background instead of
  // leaving it default black/white.
  themeColor: "#f4f1ea",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${albertSans.variable} ${instrumentSerif.variable}`}>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
