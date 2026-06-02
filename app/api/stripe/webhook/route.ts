import { NextResponse } from "next/server";
import { verifyWebhook, handleWebhookEvent } from "@/lib/billing";
import { sanitizeForLog } from "@/lib/api-auth";

export const runtime = "nodejs";
// Never cache or pre-render — this is a pure side-effect endpoint.
export const dynamic = "force-dynamic";

/**
 * POST /api/stripe/webhook
 *
 * Stripe -> us. Public (no Clerk/session): authenticity comes entirely from
 * the HMAC signature in the `Stripe-Signature` header, which we verify
 * against STRIPE_WEBHOOK_SECRET before trusting a single byte.
 *
 * CRITICAL: read the RAW body with req.text(). Signature verification hashes
 * the exact bytes Stripe sent; any re-serialization (req.json()) would change
 * whitespace/ordering and break the check.
 *
 * Register this URL in the Stripe dashboard for: checkout.session.completed,
 * customer.subscription.updated, customer.subscription.deleted.
 */
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  const event = verifyWebhook(rawBody, signature);
  if (!event) {
    // Bad/absent signature, stale timestamp, or unparseable body.
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    await handleWebhookEvent(event);
  } catch (err) {
    console.error("[/api/stripe/webhook] handler failed", sanitizeForLog(err));
    // 500 → Stripe retries with backoff. Better to retry a state change than
    // to drop it on a transient DB blip.
    return NextResponse.json({ error: "Handler error." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
