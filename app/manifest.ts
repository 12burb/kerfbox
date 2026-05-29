import type { MetadataRoute } from "next";
import { SITE_NAME, SITE_TAGLINE, SITE_DESCRIPTION } from "@/lib/site";

/**
 * PWA / install manifest. Next serves this at /manifest.webmanifest and
 * injects the <link rel="manifest"> automatically. Theme colors track the
 * brand (near-black surface, red accent). Icons reuse the existing
 * favicon.ico until dedicated maskable PNGs are added.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — ${SITE_TAGLINE}`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0c",
    theme_color: "#0a0a0c",
    categories: ["business", "productivity", "marketing"],
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
