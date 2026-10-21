import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Grafeat",
  description:
    "Grafeat collects your challenge submissions, checks the rules, prepares your carousel and keeps every credit in order.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${albertSans.variable} ${instrumentSerif.variable}`}>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
