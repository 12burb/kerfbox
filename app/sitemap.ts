import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Public, indexable routes only. The app, archive, and per-user/API routes
 * are auth-gated or user-scoped and stay out of the sitemap (and are
 * disallowed in robots.ts). Add new public marketing pages here.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
