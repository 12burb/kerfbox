"use client";

import { useState } from "react";
import { AlertCircle, Eye, EyeOff, KeyRound, Play } from "lucide-react";
import { ACCENT, ACCENT_DIM, BG_2, MUTED } from "./shared";

type Props = {
  url: string;
  audience: string;
  byokKey: string;
  error: string | null;
  /** True when the signed-in user can run on the in-house agent (Pro, or a
   *  self-host with a server key). Makes BYOK optional. */
  canUseInHouse?: boolean;
  onUrlChange: (v: string) => void;
  onAudienceChange: (v: string) => void;
  onByokKeyChange: (v: string) => void;
  onRun: (demoMode: boolean) => void;
};

/**
 * The /app entry form. Three fields: URL, audience, Anthropic key (BYOK).
 *
 * BYOK is required for live runs because we deliberately do not ship a
 * server fallback Anthropic key on this surface — strategy that an
 * unauthenticated visitor pays for is worse than honest demo content.
 * If the key field is empty, the demo button is the only path forward.
 *
 * The key never leaves the request boundary: it goes straight into the
 * `X-Anthropic-Key` header on /api/strategy and is dropped from React
 * state on reset. We don't persist it anywhere.
 */
export default function InputStage({
  url,
  audience,
  byokKey,
  error,
  canUseInHouse = false,
  onUrlChange,
  onAudienceChange,
  onByokKeyChange,
  onRun,
}: Props) {
  const [keyVisible, setKeyVisible] = useState(false);
  const hasKey = byokKey.trim().length > 0;
  // Live runs need EITHER a pasted key OR Pro/in-house entitlement.
  const canRunLive = hasKey || canUseInHouse;

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
            <label className="mono text-[10px] uppercase tracking-widest mb-3 block" style={{ color: MUTED }}>
              01 · Product URL
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => onUrlChange(e.target.value)}
              placeholder="https://yourbrand.com"
              className="input-field w-full pb-2 text-lg"
            />
          </div>
          <div>
            <label className="mono text-[10px] uppercase tracking-widest mb-3 block" style={{ color: MUTED }}>
              02 · Audience (one line)
            </label>
            <input
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
            className="mono text-[10px] uppercase tracking-widest mb-3 flex items-center gap-2"
            style={{ color: MUTED }}
          >
            <KeyRound size={12} />
            03 · Anthropic key (BYOK) ·{" "}
            {canUseInHouse ? (
              <span style={{ color: MUTED }}>optional — you&rsquo;re on the in-house agent</span>
            ) : (
              <span style={{ color: ACCENT }}>required for live runs</span>
            )}
          </label>
          <div className="flex items-stretch gap-2">
            <input
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
            disabled={!canRunLive}
            className="btn-red px-8 py-4 mono text-sm uppercase tracking-widest font-bold inline-flex items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
            title={canRunLive ? "" : "Paste an Anthropic key, or upgrade to Pro to run on our agent."}
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
          { tag: "Refusal rule", text: "If the moat doesn't reference a competitor and a structural reason, the route returns 422." },
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
