"use client";

import { useState } from "react";
import { AlertCircle, Eye, EyeOff, KeyRound, Play } from "lucide-react";
import { ACCENT, ACCENT_DIM, BG_2, MUTED } from "./shared";

type Props = {
  url: string;
  audience: string;
  byokKey: string;
  error: string | null;
  onUrlChange: (v: string) => void;
  onAudienceChange: (v: string) => void;
  onByokKeyChange: (v: string) => void;
  onRun: (demoMode: boolean) => void;
};

/**
 * The /app entry form. Three fields: URL, audience, Anthropic key (BYOK).
 *
 * kerf.box is free: there is no server-paid generation on the hosted app.
 * Every live run uses the visitor's OWN Anthropic key (pasted here) or a
 * Claude MCP connection. We deliberately do not ship a server fallback key
 * on this surface, so if the key field is empty the demo button is the only
 * path forward.
 *
 * The key goes straight into the `X-Anthropic-Key` header on /api/strategy
 * and is never stored, logged, or proxied server-side. The parent (/app)
 * may keep it in the browser's localStorage so it survives a reload;
 * clearing the field wipes it from the browser for good.
 */
export default function InputStage({
  url,
  audience,
  byokKey,
  error,
  onUrlChange,
  onAudienceChange,
  onByokKeyChange,
  onRun,
}: Props) {
  const [keyVisible, setKeyVisible] = useState(false);
  // Live runs require the visitor's own Anthropic key (BYOK) or a Claude
  // MCP connection. No key → demo is the only path.
  const hasKey = byokKey.trim().length > 0;

  return (
    <div className="relative">
      <div className="grid md:grid-cols-12 gap-8 items-end mb-16">
        <div className="md:col-span-8">
          <div className="mono text-xs uppercase tracking-widest mb-4" style={{ color: ACCENT }}>
            ⎯ 01 / Cut
          </div>
          <h1 className="serif leading-[0.92] text-5xl md:text-7xl" style={{ fontWeight: 300 }}>
            Strategy is a <em style={{ color: ACCENT, fontStyle: "italic", fontWeight: 400 }}>cut</em>,
            <br />
            not a <span style={{ fontWeight: 600 }}>story</span>.
            <br />
            Find the kerf.
          </h1>
        </div>
        <div className="md:col-span-4">
          <p className="text-sm leading-relaxed" style={{ color: MUTED }}>
            Drop a URL, one line about your audience, and your Anthropic key. In under 90 seconds
            you get a cluster map, the kerf between clusters, a wedge with a structural moat, and
            a 7-day calendar. If the moat doesn&rsquo;t hold, the system refuses to ship.
          </p>
        </div>
      </div>

      <div className="relative p-8 md:p-12 border" style={{ borderColor: ACCENT_DIM, background: BG_2 }}>
        <div className="absolute top-0 left-0 w-12 h-[2px]" style={{ background: ACCENT }} />
        <div className="absolute top-0 left-0 w-[2px] h-12" style={{ background: ACCENT }} />
        <div className="absolute bottom-0 right-0 w-12 h-[2px]" style={{ background: ACCENT }} />
        <div className="absolute bottom-0 right-0 w-[2px] h-12" style={{ background: ACCENT }} />

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div>
            <label
              htmlFor="kerf-url"
              className="mono text-[10px] uppercase tracking-widest mb-3 block"
              style={{ color: MUTED }}
            >
              01 · Product URL
            </label>
            <input
              id="kerf-url"
              type="text"
              value={url}
              onChange={(e) => onUrlChange(e.target.value)}
              placeholder="https://yourbrand.com"
              className="input-field w-full pb-2 text-lg"
            />
          </div>
          <div>
            <label
              htmlFor="kerf-audience"
              className="mono text-[10px] uppercase tracking-widest mb-3 block"
              style={{ color: MUTED }}
            >
              02 · Audience (one line)
            </label>
            <input
              id="kerf-audience"
              type="text"
              value={audience}
              onChange={(e) => onAudienceChange(e.target.value)}
              placeholder="Hardcore PvP gamers, 18-34"
              className="input-field w-full pb-2 text-lg"
            />
          </div>
        </div>

        {/* BYOK row */}
        <div className="mb-6">
          <label
            htmlFor="kerf-byok-key"
            className="mono text-[10px] uppercase tracking-widest mb-3 flex items-center gap-2"
            style={{ color: MUTED }}
          >
            <KeyRound size={12} />
            03 · Anthropic key (BYOK) ·{" "}
            <span style={{ color: ACCENT }}>required for live runs (or connect via Claude MCP)</span>
          </label>
          <div className="flex items-stretch gap-2">
            <input
              id="kerf-byok-key"
              type={keyVisible ? "text" : "password"}
              value={byokKey}
              onChange={(e) => onByokKeyChange(e.target.value)}
              placeholder="sk-ant-..."
              autoComplete="off"
              spellCheck={false}
              className="input-field flex-1 pb-2 text-base mono"
            />
            <button
              type="button"
              onClick={() => setKeyVisible((v) => !v)}
              className="mono text-[10px] uppercase tracking-widest px-3 border flex items-center gap-1.5"
              style={{ borderColor: ACCENT_DIM, color: MUTED }}
              aria-label={keyVisible ? "hide key" : "show key"}
            >
              {keyVisible ? <EyeOff size={12} /> : <Eye size={12} />}
              <span>{keyVisible ? "hide" : "show"}</span>
            </button>
          </div>
          <p className="mono text-[10px] mt-2 leading-relaxed" style={{ color: MUTED }}>
            Sent only as the <span style={{ color: ACCENT }}>X-Anthropic-Key</span> header on this
            request. Never stored, never logged, never proxied.{" "}
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-dotted"
              style={{ color: ACCENT }}
            >
              get a key →
            </a>
          </p>
        </div>

        {error && (
          <div
            className="flex items-center gap-2 mono text-xs mb-6 p-3"
            style={{ color: ACCENT, background: "#1f0608", border: `1px solid ${ACCENT_DIM}` }}
          >
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <div
          className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pt-4"
          style={{ borderTop: `1px solid ${ACCENT_DIM}` }}
        >
          <button
            onClick={() => onRun(false)}
            disabled={!hasKey}
            className="btn-red px-8 py-4 mono text-sm uppercase tracking-widest font-bold inline-flex items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
            title={hasKey ? "" : "Paste your Anthropic key (or connect via Claude MCP) to run live."}
          >
            <Play size={14} fill="currentColor" /> Cut a kerf
          </button>
          <button
            onClick={() => onRun(true)}
            className="mono text-xs uppercase tracking-widest underline decoration-dotted underline-offset-4"
            style={{ color: MUTED }}
          >
            or · run with demo data (no key needed)
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mt-12">
        {[
          { tag: "Cluster map", text: "Browses the web. Maps where the category clusters today, by named competitor." },
          { tag: "The kerf", text: "Names the narrow defensible cut between the clusters. With proof and a structural moat." },
          { tag: "Refusal rule", text: "If the moat doesn't reference a competitor and a structural reason, the run is refused with a reason." },
        ].map((x, i) => (
          <div key={i} className="p-5 border dash-border" style={{ borderColor: ACCENT_DIM, borderBottom: 0 }}>
            <div className="mono text-[10px] uppercase tracking-widest mb-2" style={{ color: ACCENT }}>
              {x.tag}
            </div>
            <div className="text-sm leading-relaxed">{x.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
