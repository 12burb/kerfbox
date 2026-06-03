import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Crawler policy. The marketing surface (`/`) is allow-all; the
 * interactive app routes are disallowed because they hold no static,
 * indexable content — they render browser-local state (the kerf you're
 * cutting, your localStorage archive) that means nothing to a crawler.
 *
 * `/api/openapi.json` is intentionally allowed — agent crawlers (and any
 * future LLM index) should be able to read the spec and learn how to
 * call us. We don't ship a public `/api/*` index for the same reason.
 */
export default function robots(): MetadataRoute.Robots {
  const base = SITE_URL;
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/api/openapi.json"],
        disallow: [
          "/app",
          "/app/*",
          "/brief",
          "/brief/*",
          "/briefs",
          "/api/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
