import { NextResponse } from "next/server";
import { currentUserIdOrNull } from "@/lib/auth";
import { hasStripe, createPortalSession } from "@/lib/billing";
import { csrfGuard, sanitizeForLog } from "@/lib/api-auth";

export const runtime = "nodejs";

/**
 * POST /api/billing/portal
 *
 * Open the Stripe Billing Portal so a subscriber can update their card,
 * download invoices, or cancel. Session auth only. 400 if the user has no
 * Stripe customer yet (never subscribed) — the UI shouldn't offer "manage
 * billing" to a free user, but we guard anyway.
 *
 * Returns: { url }
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
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  const csrf = csrfGuard(req, { userId, via: "session" });
  if (csrf) return csrf;

  try {
    const url = await createPortalSession(userId);
    if (!url) {
      return NextResponse.json(
        { error: "No billing account yet — subscribe first." },
        { status: 400 }
      );
    }
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[/api/billing/portal] failed", sanitizeForLog(err));
    return NextResponse.json({ error: "Could not open billing portal." }, { status: 500 });
  }
}
