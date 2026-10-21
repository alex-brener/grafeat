import type { Metadata } from "next";
import { Albert_Sans, Instrument_Serif } from "next/font/google";
import "./globals.css";

const albertSans = Albert_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-albert-sans",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400"],
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
      <body>{children}</body>
    </html>
  );
}
