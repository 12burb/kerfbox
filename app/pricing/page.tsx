import Link from "next/link";
import type { Metadata } from "next";
import { SITE_NAME, REPO_URL, PRICE_MONTHLY_USD } from "@/lib/site";
import { UpgradeButton } from "@/components/cmo/BillingButtons";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Pricing",
  description: `${SITE_NAME} is free with your own Anthropic key or via MCP. Pro is a flat $${PRICE_MONTHLY_USD}/mo to run on our in-house agent — no key to manage.`,
  alternates: { canonical: "/pricing" },
};

const ACCENT = "#ff1744";
const ACCENT_DIM = "#8a0a22";
const INK = "#f5f1e8";
const MUTED = "#7a7a82";
const BODY = "#cfc8ba";
const BG_2 = "#121215";

const FREE_FEATURES = [
  "Unlimited kerfs with your own Anthropic key (BYOK)",
  "Full REST API + MCP server for agents",
  "Save kerfs to your archive",
  "Mint & scope API keys",
  "The refusal engine — undefendable strategy is rejected",
  "Open source. Self-host the whole thing.",
];

const PRO_FEATURES = [
  "Everything in Free",
  "Run with no key — we cover inference on our in-house agent",
  "One flat price. No metering, no per-seat, no token math.",
  "Use it from the web app, the API, or your agent over MCP",
];

export default function PricingPage() {
  return (
    <div className="min-h-screen w-full">
      <div className="max-w-5xl mx-auto px-6 md:px-10 py-12 md:py-20">
        <div className="flex items-center justify-between mb-12">
          <Link href="/" className="mono text-[10px] uppercase tracking-widest" style={{ color: ACCENT }}>
            ← {SITE_NAME}
          </Link>
          <Link href="/app" className="mono text-[10px] uppercase tracking-widest" style={{ color: MUTED }}>
            open the app →
          </Link>
        </div>

        <div className="mb-14 max-w-2xl">
          <div className="mono text-xs uppercase tracking-widest mb-4" style={{ color: ACCENT }}>
            ⎯ Pricing
          </div>
          <h1 className="serif leading-[0.95] text-4xl md:text-6xl mb-6" style={{ fontWeight: 300 }}>
            Free to use.
            <br />
            Pay only to <em style={{ color: ACCENT, fontStyle: "italic", fontWeight: 400 }}>skip the key</em>.
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: BODY }}>
            kerf.box runs on Anthropic. Bring your own key (or connect it to your agent
            over MCP) and it&rsquo;s free, forever. Don&rsquo;t want to manage a key? Pro
            runs every request on our in-house agent for one flat monthly fee.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Free */}
          <div className="p-8 border" style={{ borderColor: ACCENT_DIM, background: BG_2 }}>
            <div className="mono text-[10px] uppercase tracking-widest mb-3" style={{ color: MUTED }}>
              Free
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="serif text-5xl" style={{ fontWeight: 400 }}>$0</span>
              <span className="mono text-[11px] uppercase tracking-widest" style={{ color: MUTED }}>
                / forever
              </span>
            </div>
            <p className="text-sm mb-6" style={{ color: MUTED }}>
              Bring your own Anthropic key, or connect via MCP.
            </p>
            <ul className="space-y-3 mb-8">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex gap-3 text-sm" style={{ color: BODY }}>
                  <span style={{ color: ACCENT }}>▪</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/app"
              className="mono text-xs uppercase tracking-widest px-6 py-4 border inline-flex items-center justify-center w-full"
              style={{ borderColor: ACCENT_DIM, color: INK }}
            >
              Start free →
            </Link>
          </div>

          {/* Pro */}
          <div className="p-8 border relative" style={{ borderColor: ACCENT, background: BG_2 }}>
            <div className="absolute top-0 right-0 mono text-[9px] uppercase tracking-widest px-3 py-1" style={{ background: ACCENT, color: "#000" }}>
              the luxury
            </div>
            <div className="mono text-[10px] uppercase tracking-widest mb-3" style={{ color: ACCENT }}>
              Pro
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="serif text-5xl" style={{ fontWeight: 400 }}>${PRICE_MONTHLY_USD}</span>
              <span className="mono text-[11px] uppercase tracking-widest" style={{ color: MUTED }}>
                / month
              </span>
            </div>
            <p className="text-sm mb-6" style={{ color: BODY }}>
              We run the agent. You never touch a key.
            </p>
            <ul className="space-y-3 mb-8">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex gap-3 text-sm" style={{ color: BODY }}>
                  <span style={{ color: ACCENT }}>▪</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <UpgradeButton />
            <p className="mono text-[10px] mt-3" style={{ color: MUTED }}>
              Cancel anytime. Secure checkout by Stripe.
            </p>
          </div>
        </div>

        <p className="mono text-[10px] mt-12 leading-relaxed" style={{ color: MUTED }}>
          Building an agent or self-hosting? You never need Pro — point the API or MCP
          server at your own Anthropic key and run unmetered.{" "}
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted" style={{ color: ACCENT }}>
            See the source →
          </a>
        </p>
      </div>
    </div>
  );
}
