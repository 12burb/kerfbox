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
export const REPO_URL = "https://github.com/12burb/cmoinabox";
export const ISSUES_URL = `${REPO_URL}/issues`;

/**
 * Pricing — display strings only. The billing *logic* (Stripe price id,
 * entitlement checks) lives in lib/billing.ts. Kept here so the marketing
 * surface (landing page, /pricing) and structured data render one number.
 *
 * Model: the app is free with your own Anthropic key (BYOK) or via MCP.
 * The single paid perk is the in-house agent — we run inference on our key
 * so you never manage one. Flat monthly, no metering, no seats.
 */
export const PRICE_MONTHLY_USD = 15;
export const PRO_PLAN_NAME = "Pro";
export const FREE_PLAN_NAME = "Free";

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
