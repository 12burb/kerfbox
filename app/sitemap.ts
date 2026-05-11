import type { MetadataRoute } from "next";

/**
 * Only the public landing page is indexed. Everything else is either
 * auth-gated or user-scoped and shouldn't appear in a sitemap. If we
 * add public marketing pages (e.g. /method, /pricing, /changelog),
 * append them here.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cmoinabox.vercel.app";
  const now = new Date();
  return [
    {
      url: `${base}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
  ];
}
