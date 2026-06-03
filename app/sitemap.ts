import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Public, indexable routes only. The app, archive, and API routes render
 * browser-local state (the kerf you're cutting, your localStorage archive)
 * or machine endpoints — nothing a crawler should index — so they stay out
 * of the sitemap (and are disallowed in robots.ts). Add new public
 * marketing pages here.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${SITE_URL}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
