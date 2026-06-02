import { NextResponse } from "next/server";
import { currentUserIdOrNull } from "@/lib/auth";
import { hasStripe, isSubscribed } from "@/lib/billing";
import { hasAnthropicKey } from "@/lib/anthropic";

export const runtime = "nodejs";

/**
 * GET /api/billing/status
 *
 * The /app UI calls this on mount to decide two things:
 *   • show an upgrade CTA?  → billingEnabled && !subscribed
 *   • require a BYOK key?   → !canUseInHouse
 *
 * `canUseInHouse` is the honest answer to "will a keyless run actually work
 * for you here": it needs a server key to exist AND (billing off OR you're
 * subscribed). Computed server-side so the client never has to guess.
 *
 * Session auth only. Returns a benign anonymous shape (never 500) so the
 * page renders even when signed out or when billing is unconfigured.
 */
export async function GET() {
  const userId = await currentUserIdOrNull();
  const billingEnabled = hasStripe();

  if (!userId) {
    return NextResponse.json({
      billingEnabled,
      subscribed: false,
      canUseInHouse: false,
      plan: null,
    });
  }

  const subscribed = await isSubscribed(userId); // true when billing is off
  const canUseInHouse = hasAnthropicKey() ? subscribed : false;

  return NextResponse.json({
    billingEnabled,
    subscribed: billingEnabled ? subscribed : false,
    canUseInHouse,
    plan: billingEnabled ? (subscribed ? "Pro" : "Free") : null,
  });
}
