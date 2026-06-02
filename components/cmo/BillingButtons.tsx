"use client";

import { useState } from "react";
import { ACCENT, ACCENT_DIM, MUTED } from "./shared";

/**
 * Client-side billing actions. Both POST to our server, which talks to
 * Stripe, then we redirect the whole window to the returned hosted URL
 * (Checkout or Portal). No Stripe.js on the client — nothing sensitive
 * touches the browser beyond the redirect.
 */

async function postJson(path: string): Promise<{ ok: boolean; url?: string; status: number; error?: string }> {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    return { ok: res.ok, url: body.url, status: res.status, error: body.error };
  } catch {
    return { ok: false, status: 0, error: "Network error." };
  }
}

/** Big primary "Upgrade to Pro" button — used on /pricing. */
export function UpgradeButton({
  label = "Upgrade — $15/mo",
  className,
}: {
  label?: string;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    setLoading(true);
    setError(null);
    const r = await postJson("/api/billing/checkout");
    if (r.ok && r.url) {
      window.location.href = r.url;
      return;
    }
    if (r.status === 401) {
      // Not signed in — send them to sign-up, then back to pricing.
      window.location.href = "/sign-up?redirect_url=/pricing";
      return;
    }
    setLoading(false);
    setError(
      r.status === 503
        ? "Payments aren't enabled on this deployment yet."
        : r.error ?? "Could not start checkout."
    );
  };

  return (
    <div>
      <button
        onClick={onClick}
        disabled={loading}
        className={
          className ??
          "btn-red px-8 py-4 mono text-sm uppercase tracking-widest font-bold inline-flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed w-full justify-center"
        }
      >
        {loading ? "Redirecting…" : label}
      </button>
      {error && (
        <p className="mono text-[10px] mt-3" style={{ color: ACCENT }}>
          {error}
        </p>
      )}
    </div>
  );
}

/** Small "Manage billing" link — used in the /app header for subscribers. */
export function ManageBillingButton() {
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    setLoading(true);
    const r = await postJson("/api/billing/portal");
    if (r.ok && r.url) {
      window.location.href = r.url;
      return;
    }
    setLoading(false);
  };

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="mono text-[11px] uppercase tracking-widest px-3 py-2 border disabled:opacity-50"
      style={{ borderColor: ACCENT_DIM, color: MUTED }}
    >
      {loading ? "…" : "manage billing"}
    </button>
  );
}
