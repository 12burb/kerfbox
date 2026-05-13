import type { MetadataRoute } from "next";

/**
 * Crawler policy. The marketing surface (`/`) is allow-all; everything
 * authenticated or transactional is disallowed so search engines don't
 * try to index sign-in walls or per-user routes.
 *
 * `/api/openapi.json` is intentionally allowed — agent crawlers (and any
 * future LLM index) should be able to read the spec and learn how to
 * call us. We don't ship a public `/api/*` index for the same reason
 * we don't ship CRUD docs on a sign-in page.
 */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kerfbox.vercel.app";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/api/openapi.json"],
        disallow: ["/app", "/app/*", "/brief", "/brief/*", "/briefs", "/api/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
