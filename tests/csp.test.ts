import { describe, expect, it } from "vitest";
// @ts-expect-error — plain JS config file (Next's own convention), no declaration file to import against.
import nextConfig from "../next.config.mjs";

interface HeaderEntry {
  key: string;
  value: string;
}
interface HeaderGroup {
  source: string;
  headers: HeaderEntry[];
}
interface NextConfigShape {
  headers: () => Promise<HeaderGroup[]>;
}

// next.config.mjs has no type declarations of its own (plain JS, per Next's
// own convention) — cast once here rather than importing with implicit `any`.
const config = nextConfig as unknown as NextConfigShape;

/**
 * Regression coverage for the img-src/Instagram-CDN bug: gallery images
 * were silently blocked because next.config.mjs's CSP had no img-src entry
 * for Meta's CDN host at all (docs/meta-api-experiments.md Experiment 11 +
 * live QA confirmed submission.mediaUrl resolves to scontent.cdninstagram.com).
 * This asserts the allowance exists and stays scoped — not a blanket
 * weakening of img-src.
 */
describe("Content-Security-Policy", () => {
  it("allows Instagram's CDN host in img-src, scoped to that one domain", async () => {
    const headerGroups = await config.headers();
    const csp = headerGroups.flatMap((group) => group.headers).find((h) => h.key === "Content-Security-Policy")?.value;
    expect(csp).toBeDefined();

    const imgSrc = csp!
      .split(";")
      .map((d) => d.trim())
      .find((d) => d.startsWith("img-src"));
    expect(imgSrc).toBeDefined();
    expect(imgSrc).toContain("https://*.cdninstagram.com");

    // Scoped, not a blanket relaxation — no bare wildcard or arbitrary https: source.
    expect(imgSrc).not.toMatch(/(^|\s)\*(\s|$)/);
    expect(imgSrc!.split(/\s+/)).not.toContain("https:");
  });

  it("applies the same CSP to both API and page routes", async () => {
    const headerGroups = await config.headers();
    for (const group of headerGroups) {
      const csp = group.headers.find((h) => h.key === "Content-Security-Policy")?.value;
      expect(csp).toContain("https://*.cdninstagram.com");
    }
  });
});
