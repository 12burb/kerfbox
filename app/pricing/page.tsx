import Link from "next/link";
import type { Metadata } from "next";
import { SITE_NAME, REPO_URL } from "@/lib/site";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Pricing",
  description: `${SITE_NAME} is free. Bring a key from any AI provider (BYOK) or connect it to your agent over MCP. No subscriptions, no metering, no per-seat fees.`,
  alternates: { canonical: "/pricing" },
};

const ACCENT = "#ff1744";
const ACCENT_DIM = "#8a0a22";
const INK = "#f5f1e8";
const MUTED = "#7a7a82";
const BODY = "#cfc8ba";
const BG_2 = "#121215";

const FREE_FEATURES = [
  "Kerfs on your own key — Claude, OpenAI, Gemini, Kimi, Qwen, DeepSeek, Groq, OpenRouter, Ollama, or any custom endpoint",
  "Or connect it to Claude over the MCP server — no key to paste",
  "Full REST API + MCP server for agents — no account, no API key",
  "Save kerfs in your browser; export & import as JSON to share",
  "No sign-up — every page is public",
  "The refusal engine — undefendable strategy is rejected",
  "Open source. Self-host the whole thing.",
];

export default function PricingPage() {
  return (
    <div className="min-h-screen w-full">
      <div className="max-w-3xl mx-auto px-6 md:px-10 py-12 md:py-20">
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
            It&rsquo;s <em style={{ color: ACCENT, fontStyle: "italic", fontWeight: 400 }}>free</em>.
            <br />
            You bring the key.
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: BODY }}>
            kerf.box runs on whatever AI provider you already use — Claude, OpenAI,
            Gemini, Kimi, Qwen, DeepSeek, Groq, OpenRouter, even a local Ollama.
            Bring your own key (or connect it to your agent over MCP) and it&rsquo;s
            free, forever. We never charge you, and we never run generation on our
            own key — every live run is yours, billed to your own provider account.
            No subscriptions, no metering, no per-seat math.
          </p>
        </div>

        <div className="p-8 border" style={{ borderColor: ACCENT, background: BG_2 }}>
          <div className="mono text-[10px] uppercase tracking-widest mb-3" style={{ color: ACCENT }}>
            Free
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="serif text-5xl" style={{ fontWeight: 400 }}>$0</span>
            <span className="mono text-[11px] uppercase tracking-widest" style={{ color: MUTED }}>
              / forever
            </span>
          </div>
          <p className="text-sm mb-6" style={{ color: MUTED }}>
            Bring a key from any AI provider, or connect via MCP. You only ever
            pay your provider for the tokens you use.
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

        <p className="mono text-[10px] mt-12 leading-relaxed" style={{ color: MUTED }}>
          Your key lives only in your browser and is sent to our API as a single
          per-request header — never stored, logged, or proxied. Building an agent
          or self-hosting? Point the API or MCP server at your own key — we add no
          metering (only a per-IP abuse cap); the only bill is your own provider
          usage.{" "}
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted" style={{ color: ACCENT }}>
            See the source →
          </a>
        </p>
      </div>
    </div>
  );
}
