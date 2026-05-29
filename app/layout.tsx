import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import {
  SITE_URL,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  REPO_URL,
} from "@/lib/site";

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

const hasClerk = !!(
  process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
);

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
  const body = (
    <html lang="en">
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
  if (!hasClerk) return body;
  return <ClerkProvider>{body}</ClerkProvider>;
}
