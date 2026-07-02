import type { Metadata, Viewport } from "next";
import { Fraunces, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import {
  SITE_URL,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  REPO_URL,
} from "@/lib/site";

// Self-hosted via next/font: fonts ship from our own origin with zero
// render-blocking third-party CSS (the old Google Fonts @import cost a
// fonts.googleapis.com round-trip before first paint). All three are
// variable fonts, so one file per family covers every weight we use.
const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-fraunces",
});
const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken-grotesk",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

const TITLE = `${SITE_NAME} — ${SITE_TAGLINE}`;

export const metadata: Metadata = {
  // metadataBase makes every relative OG/Twitter/canonical URL resolve to
  // the production origin (or the preview origin when NEXT_PUBLIC_SITE_URL
  // is set). Without it, Next emits a build-time warning and ships
  // root-relative social image URLs that crawlers can't fetch.
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    // Inner pages set just their name; the brand suffix is appended here.
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: SITE_KEYWORDS,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: SITE_URL,
    title: TITLE,
    description: SITE_DESCRIPTION,
    locale: "en_US",
    // The image is supplied automatically by app/opengraph-image.tsx —
    // Next injects the og:image tags from that file, so we don't repeat
    // the URL here.
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  category: "technology",
};

// theme-color paints mobile browser chrome (address bar, task switcher)
// in the site's near-black instead of default white — the manifest already
// declares it for installed-PWA contexts, but the meta tag is what normal
// tab browsing reads.
export const viewport: Viewport = {
  themeColor: "#0a0a0c",
};

/**
 * Site-wide structured data. SoftwareApplication tells search/LLM indexes
 * what kerf.box *is* and that it has a free (beta) tier; the nested
 * Organization gives the brand an entity to attach to. FAQPage lives on
 * the landing page itself (app/page.tsx) where the visible Q&A is.
 *
 * Rendered as a single graph so crawlers parse one block. No personal
 * contact data — support routes through the public issue tracker.
 */
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        description: "Beta — unmetered with your own Anthropic key (BYOK).",
      },
      featureList: [
        "Cluster map of where a category competes",
        "Narrow defensible kerf between clusters",
        "Wedge with an enforced structural moat",
        "Refusal rule: undefendable strategy is rejected",
        "Public OpenAPI 3.1 + MCP server for agents",
      ],
      author: {
        "@type": "Organization",
        name: SITE_NAME,
        url: SITE_URL,
      },
    },
    {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      slogan: SITE_TAGLINE,
      sameAs: [REPO_URL],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Account-free: no auth provider wraps the tree. Pages are public and the
  // API authorizes per-request on the caller's own Anthropic key (BYOK).
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${hankenGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <body className="antialiased">
        <script
          type="application/ld+json"
          // Static, build-time object — no user input flows in, so this is
          // not an injection vector.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {children}
      </body>
    </html>
  );
}
