import localFont from "next/font/local";

/**
 * The 3 display fonts used only by Challenge Curator's procedural sample
 * artwork (`makeArtInner`). Scoped to this subtree via CSS variables —
 * Stage 2 deliberately kept these off the site-wide font stack since they
 * only matter here, inside the ported product prototype.
 *
 * Self-hosted (next/font/local) rather than next/font/google: the Google
 * loader fetches font metadata/files from fonts.googleapis.com at *build*
 * time, which fails in some hosting build environments (see
 * MERGE-ASSESSMENT.md for the root-cause writeup). These are the exact same
 * files Google serves, fetched once and committed under app/fonts/.
 */

export const pinyonScript = localFont({
  src: "../../fonts/pinyon-script-latin.woff2",
  weight: "400",
  style: "normal",
  variable: "--font-pinyon-script",
  display: "swap",
});

export const bagelFatOne = localFont({
  src: "../../fonts/bagel-fat-one-latin.woff2",
  weight: "400",
  style: "normal",
  variable: "--font-bagel-fat-one",
  display: "swap",
});

export const bodoniModa = localFont({
  src: [
    { path: "../../fonts/bodoni-moda-normal-latin.woff2", weight: "400", style: "normal" },
    { path: "../../fonts/bodoni-moda-normal-latin.woff2", weight: "800", style: "normal" },
    { path: "../../fonts/bodoni-moda-italic-latin.woff2", weight: "400", style: "italic" },
    { path: "../../fonts/bodoni-moda-italic-latin.woff2", weight: "800", style: "italic" },
  ],
  variable: "--font-bodoni-moda",
  display: "swap",
});

export const curatorFontVariables = `${pinyonScript.variable} ${bagelFatOne.variable} ${bodoniModa.variable}`;
