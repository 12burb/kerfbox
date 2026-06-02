import crypto from "node:crypto";
import { getSupabaseServer } from "./supabase";
import { sanitizeForLog } from "./api-auth";
import { SITE_URL } from "./site";

/**
 * Billing — Stripe integration with NO SDK dependency.
 *
 * Why REST instead of the `stripe` npm package: the surface we need is tiny
 * (create a Checkout session, create a Portal session, retrieve a
 * subscription, verify one webhook signature). The official SDK is ~1.5 MB
 * and pulls its own types/transport; hand-rolling four `fetch` calls keeps
 * this repo's dependency list as lean as it already is and runs anywhere.
 *
 * Product model (see lib/site.ts for the prose):
 *   • Free  — bring your own Anthropic key (BYOK) or call via MCP. No charge.
 *   • Pro   — flat $15/mo. The single perk: the in-house agent. We run
 *             inference on OUR key so the user never manages one.
 *
 * The paywall ONLY activates when Stripe is configured. With STRIPE_SECRET_KEY
 * unset (self-host / OSS), isSubscribed() returns true for everyone — the
 * operator's own ANTHROPIC_API_KEY serves unmetered, exactly as before this
 * feature landed. Billing is strictly additive.
 */

const STRIPE_API = "https://api.stripe.com/v1";

/**
 * Pin the API version for the calls WE make (checkout/portal/retrieve) so a
 * future Stripe default-version bump can't silently change response shapes.
 * Note: webhook *payloads* are versioned by the account/endpoint, not this
 * header — applySubscription() reads fields defensively for that reason.
 */
const STRIPE_API_VERSION = "2024-06-20";

/** The $15/mo recurring price created in the Stripe dashboard. */
function stripePriceId(): string | null {
  return process.env.STRIPE_PRICE_ID ?? null;
}

function stripeSecretKey(): string | null {
  return process.env.STRIPE_SECRET_KEY ?? null;
}

function stripeWebhookSecret(): string | null {
  return process.env.STRIPE_WEBHOOK_SECRET ?? null;
}

/**
 * True only when Stripe is fully wired: a secret key AND a price to sell.
 * Without both, there is nothing to charge for, so the paywall stays off.
 */
export function hasStripe(): boolean {
  return Boolean(stripeSecretKey() && stripePriceId());
}

/** A user is entitled to the in-house agent while their sub is live. */
const ACTIVE_STATUSES = new Set(["active", "trialing"]);

// ───────────────────────────────────────────────────────────────────────────
// Stripe REST transport
// ───────────────────────────────────────────────────────────────────────────

/**
 * POST/GET form-encoded against the Stripe API. Throws on non-2xx so callers
 * can surface a clean 500 (the raw Stripe error is logged, scrubbed, server
 * side only). `params` is a flat record of already-bracketed keys, e.g.
 * `"line_items[0][price]"`.
 */
async function stripeRequest(
  method: "GET" | "POST",
  path: string,
  params?: Record<string, string>
): Promise<Record<string, unknown>> {
  const key = stripeSecretKey();
  if (!key) throw new Error("Stripe is not configured (no STRIPE_SECRET_KEY).");

  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    "Stripe-Version": STRIPE_API_VERSION,
  };
  let url = `${STRIPE_API}${path}`;
  let body: string | undefined;

  if (params && method === "GET") {
    url += `?${new URLSearchParams(params).toString()}`;
  } else if (params) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = new URLSearchParams(params).toString();
  }

  const res = await fetch(url, { method, headers, body });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const errMsg =
      (json?.error as { message?: string } | undefined)?.message ??
      `Stripe ${method} ${path} failed (${res.status})`;
    throw new Error(errMsg);
  }
  return json;
}

// ───────────────────────────────────────────────────────────────────────────
// Subscription cache (Supabase mirror of Stripe state)
// ───────────────────────────────────────────────────────────────────────────

export type SubscriptionRow = {
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: string;
  price_id: string | null;
  current_period_end: string | null;
};

/** Read the cached subscription row for a Clerk user, or null. */
export async function getSubscription(userId: string): Promise<SubscriptionRow | null> {
  const supabase = getSupabaseServer();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("subscriptions")
    .select(
      "user_id, stripe_customer_id, stripe_subscription_id, status, price_id, current_period_end"
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("[billing:getSubscription] failed", sanitizeForLog(error));
    return null;
  }
  return (data as SubscriptionRow) ?? null;
}

/**
 * Is this user entitled to the in-house agent (our key, no BYOK)?
 *
 * Fail-OPEN by design:
 *   • Stripe not configured → no paywall exists → everyone is "entitled"
 *     (self-host runs on the operator's own ANTHROPIC_API_KEY, as before).
 *   • Supabase unreachable / query error → don't lock out paying customers
 *     over a transient blip. Abuse is already capped by per-user rate limits
 *     (10 strategy/hr, 60 copy/hr). The miss is logged.
 *
 * The gate is intentionally cheap: one PK lookup, only hit when a caller
 * omits BYOK (the paid path).
 */
export async function isSubscribed(userId: string): Promise<boolean> {
  if (!hasStripe()) return true;
  const row = await getSubscription(userId);
  if (!row) return false; // billing on, but no row → not a paying user
  if (!ACTIVE_STATUSES.has(row.status)) return false;
  // current_period_end is extra safety: a cancel-at-period-end stays
  // 'active' until the window closes, after which Stripe fires
  // subscription.deleted. If the webhook were ever missed, this still
  // expires access on time.
  if (row.current_period_end) {
    if (new Date(row.current_period_end).getTime() < Date.now()) return false;
  }
  return true;
}

// ───────────────────────────────────────────────────────────────────────────
// Checkout + Portal (called from /api/billing/*)
// ───────────────────────────────────────────────────────────────────────────

/**
 * Create a Stripe Checkout session for the $15/mo plan and return its URL.
 * The Clerk user id rides along on client_reference_id AND both metadata
 * blocks so every downstream webhook event can map back to the user.
 */
export async function createCheckoutSession(args: {
  userId: string;
  email?: string | null;
}): Promise<string> {
  const priceId = stripePriceId();
  if (!priceId) throw new Error("Stripe is not configured (no STRIPE_PRICE_ID).");

  const params: Record<string, string> = {
    mode: "subscription",
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    success_url: `${SITE_URL}/app?upgraded=1`,
    cancel_url: `${SITE_URL}/pricing?canceled=1`,
    client_reference_id: args.userId,
    "metadata[clerk_user_id]": args.userId,
    "subscription_data[metadata][clerk_user_id]": args.userId,
    allow_promotion_codes: "true",
    // Re-use an existing customer if we already have one (avoids dupes when
    // a user upgrades, cancels, then upgrades again).
  };
  // Prefer an existing Stripe customer so the user keeps one billing record.
  const existing = await getSubscription(args.userId);
  if (existing?.stripe_customer_id) {
    params["customer"] = existing.stripe_customer_id;
  } else if (args.email) {
    params["customer_email"] = args.email;
  }

  const session = await stripeRequest("POST", "/checkout/sessions", params);
  const url = session.url as string | undefined;
  if (!url) throw new Error("Stripe did not return a Checkout URL.");
  return url;
}

/**
 * Create a Billing Portal session so a subscriber can update card / cancel.
 * Returns null when the user has no Stripe customer yet (never subscribed).
 */
export async function createPortalSession(userId: string): Promise<string | null> {
  const row = await getSubscription(userId);
  if (!row?.stripe_customer_id) return null;
  const session = await stripeRequest("POST", "/billing_portal/sessions", {
    customer: row.stripe_customer_id,
    return_url: `${SITE_URL}/app`,
  });
  return (session.url as string | undefined) ?? null;
}

// ───────────────────────────────────────────────────────────────────────────
// Webhook: verify signature, then mirror state into Supabase
// ───────────────────────────────────────────────────────────────────────────

/**
 * Verify a Stripe webhook signature by hand (what stripe.webhooks.
 * constructEvent does internally): recompute HMAC-SHA256 over
 * `${timestamp}.${rawBody}` with the endpoint secret and timing-safe
 * compare against the v1 signature(s) in the `Stripe-Signature` header.
 * Also enforces a 5-minute timestamp tolerance to blunt replay.
 *
 * Returns the parsed event on success, or null on any failure (bad sig,
 * stale timestamp, malformed header/body) — the caller returns 400.
 */
export function verifyWebhook(
  rawBody: string,
  signatureHeader: string | null,
  toleranceSeconds = 300
): Record<string, unknown> | null {
  const secret = stripeWebhookSecret();
  if (!secret || !signatureHeader) return null;

  // Header shape: "t=1234567890,v1=abc...,v1=def...,v0=..."
  let timestamp: string | null = null;
  const v1Signatures: string[] = [];
  for (const part of signatureHeader.split(",")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k === "t") timestamp = v;
    else if (k === "v1") v1Signatures.push(v);
  }
  if (!timestamp || v1Signatures.length === 0) return null;

  // Replay window.
  const now = Math.floor(Date.now() / 1000);
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > toleranceSeconds) return null;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");
  const expectedBuf = Buffer.from(expected, "utf8");

  const matched = v1Signatures.some((sig) => {
    const sigBuf = Buffer.from(sig, "utf8");
    return (
      sigBuf.length === expectedBuf.length &&
      crypto.timingSafeEqual(sigBuf, expectedBuf)
    );
  });
  if (!matched) return null;

  try {
    return JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Pull current_period_end (epoch secs) defensively across API versions. */
function periodEndIso(sub: Record<string, unknown>): string | null {
  let epoch = sub["current_period_end"] as number | undefined;
  if (typeof epoch !== "number") {
    // Newer API versions moved it onto the subscription item.
    const items = (sub["items"] as { data?: Array<Record<string, unknown>> } | undefined)
      ?.data;
    epoch = items?.[0]?.["current_period_end"] as number | undefined;
  }
  return typeof epoch === "number" ? new Date(epoch * 1000).toISOString() : null;
}

function priceIdOf(sub: Record<string, unknown>): string | null {
  const items = (sub["items"] as { data?: Array<Record<string, unknown>> } | undefined)
    ?.data;
  const price = items?.[0]?.["price"] as { id?: string } | undefined;
  return price?.id ?? null;
}

/** Upsert our cache from a Stripe subscription object. */
async function applySubscription(
  sub: Record<string, unknown>,
  fallbackUserId?: string | null
): Promise<void> {
  const supabase = getSupabaseServer();
  if (!supabase) return;

  const metadata = (sub["metadata"] as Record<string, string> | undefined) ?? {};
  const userId = metadata["clerk_user_id"] ?? fallbackUserId ?? null;
  const customerId = (sub["customer"] as string | undefined) ?? null;

  // No user id and no customer id → nothing to key on. Try resolving by
  // customer id if that's all we have.
  let resolvedUserId: string | null = userId;
  if (!resolvedUserId && customerId) {
    const { data } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    resolvedUserId = (data as { user_id?: string } | null)?.user_id ?? null;
  }
  if (!resolvedUserId) {
    console.error("[billing:webhook] could not map subscription to a user");
    return;
  }

  const { error } = await supabase.from("subscriptions").upsert(
    {
      user_id: resolvedUserId,
      stripe_customer_id: customerId,
      stripe_subscription_id: (sub["id"] as string | undefined) ?? null,
      status: (sub["status"] as string | undefined) ?? "incomplete",
      price_id: priceIdOf(sub),
      current_period_end: periodEndIso(sub),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) console.error("[billing:webhook] upsert failed", sanitizeForLog(error));
}

/**
 * Handle a verified webhook event. We care about three event types:
 *   • checkout.session.completed   — first payment; retrieve the sub to get
 *                                    accurate status/period, then cache it.
 *   • customer.subscription.updated — renewals, plan/status changes.
 *   • customer.subscription.deleted — cancellation; mark canceled.
 * Everything else is acknowledged (200) and ignored.
 */
export async function handleWebhookEvent(event: Record<string, unknown>): Promise<void> {
  const type = event["type"] as string | undefined;
  const obj = (event["data"] as { object?: Record<string, unknown> } | undefined)?.object;
  if (!type || !obj) return;

  if (type === "checkout.session.completed") {
    const userId =
      (obj["client_reference_id"] as string | undefined) ??
      ((obj["metadata"] as Record<string, string> | undefined)?.["clerk_user_id"] ??
        null);
    const subId = obj["subscription"] as string | undefined;
    if (subId) {
      // Retrieve the subscription to read its real status + period end.
      const sub = await stripeRequest("GET", `/subscriptions/${subId}`);
      await applySubscription(sub, userId);
    }
    return;
  }

  if (type === "customer.subscription.updated" || type === "customer.subscription.deleted") {
    await applySubscription(obj);
    return;
  }
}
