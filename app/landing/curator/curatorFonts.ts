import { Pinyon_Script, Bagel_Fat_One, Bodoni_Moda } from "next/font/google";

/**
 * The 3 display fonts used only by Challenge Curator's procedural sample
 * artwork (`makeArtInner`). Scoped to this subtree via CSS variables —
 * Stage 2 deliberately kept these off the site-wide font stack since they
 * only matter here, inside the ported product prototype.
 */

export const pinyonScript = Pinyon_Script({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-pinyon-script",
  display: "swap",
});

export const bagelFatOne = Bagel_Fat_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-bagel-fat-one",
  display: "swap",
});

export const bodoniModa = Bodoni_Moda({
  subsets: ["latin"],
  weight: ["400", "800"],
  style: ["normal", "italic"],
  variable: "--font-bodoni-moda",
  display: "swap",
});

export const curatorFontVariables = `${pinyonScript.variable} ${bagelFatOne.variable} ${bodoniModa.variable}`;
