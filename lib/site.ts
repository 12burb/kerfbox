/**
 * Single source of truth for public site identity — URL, name, tagline,
 * social handles. Imported by metadata (app/layout.tsx), structured data
 * (JSON-LD), the OG image, the web manifest, robots, and the sitemap so
 * the brand never drifts between surfaces.
 *
 * SITE_URL resolves from NEXT_PUBLIC_SITE_URL when set (so preview/staging
 * deployments self-canonicalize) and falls back to the production alias.
 * No trailing slash — callers append paths.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://kerfbox.vercel.app"
).replace(/\/+$/, "");

export const SITE_NAME = "kerf.box";

export const SITE_TAGLINE = "Strategy is a cut, not a story";

export const SITE_DESCRIPTION =
  "kerf.box maps where your category clusters, finds the narrow defensible cut, and ships a wedge with a structural moat. If the moat doesn't hold, the system refuses to ship.";

/**
 * Public contact / source surface. We deliberately route support through
 * the GitHub issue tracker rather than a personal inbox — no private email
 * ever lands in shipped markup or structured data.
 */
export const REPO_URL = "https://github.com/12burb/kerfbox";
export const ISSUES_URL = `${REPO_URL}/issues`;

/** Keyword set for <meta keywords> and structured data. */
export const SITE_KEYWORDS = [
  "marketing strategy",
  "positioning",
  "go-to-market",
  "category design",
  "competitive moat",
  "brand wedge",
  "AI strategy tool",
  "MCP server",
  "Anthropic Claude",
  "BYOK",
  "kerf",
  "kerf.box",
];
