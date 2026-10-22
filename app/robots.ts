import type { MetadataRoute } from "next";

// Crawling only — this has no effect on real users' browsers, including the
// Meta OAuth redirect flow through /api/auth/*/callback (robots.txt is an
// advisory convention for crawlers, not an access-control mechanism, so it
// cannot block a real navigation from completing).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dev"],
    },
  };
}
