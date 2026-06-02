import { NextResponse } from "next/server";
import { currentUserIdOrNull, currentUserEmailOrNull } from "@/lib/auth";
import { hasStripe, createCheckoutSession } from "@/lib/billing";
import { csrfGuard, sanitizeForLog } from "@/lib/api-auth";

export const runtime = "nodejs";

/**
 * POST /api/billing/checkout
 *
 * Start a Stripe Checkout session for the Pro ($15/mo) plan and return its
 * hosted URL. Browser-session auth only — this is a human action (the
 * upgrade button), not something an agent does. Agents stay free via BYOK.
 *
 * Returns: { url } → the client redirects the window to it.
 */
export async function POST(req: Request) {
  if (!hasStripe()) {
    return NextResponse.json(
      { error: "Billing is not enabled on this deployment." },
      { status: 503 }
    );
  }
  const userId = await currentUserIdOrNull();
  if (!userId) {
    return NextResponse.json({ error: "Sign in to upgrade." }, { status: 401 });
  }
  // State-changing session call → same-origin guard.
  const csrf = csrfGuard(req, { userId, via: "session" });
  if (csrf) return csrf;

  try {
    const email = await currentUserEmailOrNull();
    const url = await createCheckoutSession({ userId, email });
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[/api/billing/checkout] failed", sanitizeForLog(err));
    return NextResponse.json({ error: "Could not start checkout." }, { status: 500 });
  }
}
