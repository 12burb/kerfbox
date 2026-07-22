"use client";

import { useState } from "react";
import { AlertCircle, Eye, EyeOff, HelpCircle, KeyRound, Play } from "lucide-react";
import { ACCENT, ACCENT_DIM, BG_2, MUTED } from "./shared";
import { PROVIDERS, PROVIDER_LIST, type ProviderId } from "@/lib/providers";
import { activeKey, canRunLive, type ByokSettings } from "@/lib/byok-store";

type Props = {
  url: string;
  audience: string;
  byok: ByokSettings;
  error: string | null;
  onUrlChange: (v: string) => void;
  onAudienceChange: (v: string) => void;
  onByokChange: (v: ByokSettings) => void;
  onRun: (demoMode: boolean) => void;
};

/**
 * The /app entry form: URL, audience, and the BYOK provider block.
 *
 * kerf.box is free and account-free: there is no server-paid generation
 * on the hosted app. Every live run uses the visitor's OWN key for
 * WHATEVER provider they pick — Anthropic (the only one with live web
 * research), OpenAI, Gemini, Kimi, Qwen, DeepSeek, Groq, OpenRouter, a
 * local Ollama, or any custom OpenAI-compatible endpoint. No key → the
 * demo button is the only path forward.
 *
 * Keys go straight into per-request headers (X-Provider/X-Api-Key, or
 * X-Anthropic-Key) and are never stored, logged, or proxied server-side.
 * The parent (/app) persists settings per-provider in this browser's
 * localStorage so a reload doesn't eat them; clearing a field wipes it
 * from the browser for good.
 */
export default function InputStage({
  url,
  audience,
  byok,
  error,
  onUrlChange,
  onAudienceChange,
  onByokChange,
  onRun,
}: Props) {
  const [keyVisible, setKeyVisible] = useState(false);
  const preset = PROVIDERS[byok.provider];
  const key = activeKey(byok);
  const model = byok.models[byok.provider] ?? "";
  const baseUrl = byok.baseUrls[byok.provider] ?? "";
  const showBaseUrl = byok.provider === "ollama" || byok.provider === "custom";
  const liveReady = canRunLive(byok);

  const setProvider = (provider: ProviderId) => onByokChange({ ...byok, provider });
  const setKey = (v: string) =>
    onByokChange({ ...byok, keys: { ...byok.keys, [byok.provider]: v } });
  const setModel = (v: string) =>
    onByokChange({ ...byok, models: { ...byok.models, [byok.provider]: v } });
  const setBaseUrl = (v: string) =>
    onByokChange({ ...byok, baseUrls: { ...byok.baseUrls, [byok.provider]: v } });

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
            Drop a URL, one line about your audience, and a key from any AI provider — Claude,
            OpenAI, Gemini, Kimi, Qwen, DeepSeek, Groq, OpenRouter, even a local Ollama. In under
            90 seconds you get a cluster map, the kerf between clusters, a wedge with a structural
            moat, and a 7-day calendar. If the moat doesn&rsquo;t hold, the system refuses to ship.
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

        {/* BYOK block: provider picker + key + model (+ base URL) */}
        <div className="mb-6">
          <div
            className="mono text-[10px] uppercase tracking-widest mb-3 flex items-center gap-2"
            style={{ color: MUTED }}
          >
            <KeyRound size={12} />
            03 · Your AI provider (BYOK) ·{" "}
            <span style={{ color: ACCENT }}>any key works — or run the demo with none</span>
            <a
              href="/help"
              className="inline-flex items-center gap-1 underline decoration-dotted"
              style={{ color: MUTED }}
            >
              <HelpCircle size={11} /> help
            </a>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label
                htmlFor="kerf-provider"
                className="mono text-[10px] uppercase tracking-widest mb-2 block"
                style={{ color: MUTED }}
              >
                Provider
              </label>
              <select
                id="kerf-provider"
                value={byok.provider}
                onChange={(e) => setProvider(e.target.value as ProviderId)}
                className="input-field w-full pb-2 text-base mono"
                style={{ background: BG_2, color: "inherit" }}
              >
                {PROVIDER_LIST.map((p) => (
                  <option key={p.id} value={p.id} style={{ background: BG_2 }}>
                    {p.label}
                    {p.kind === "anthropic" ? " — live web research" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="kerf-model"
                className="mono text-[10px] uppercase tracking-widest mb-2 block"
                style={{ color: MUTED }}
              >
                Model <span style={{ textTransform: "none" }}>(optional)</span>
              </label>
              <input
                id="kerf-model"
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={
                  preset.defaultModel ??
                  (byok.provider === "anthropic" ? "default: claude sonnet" : "model id (required)")
                }
                autoComplete="off"
                spellCheck={false}
                className="input-field w-full pb-2 text-base mono"
              />
            </div>
          </div>

          <div className="flex items-stretch gap-2">
            <input
              id="kerf-byok-key"
              type={keyVisible ? "text" : "password"}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder={preset.keyOptional ? `API key (optional — ${preset.keyHint})` : preset.keyHint}
              autoComplete="off"
              spellCheck={false}
              aria-label={`${preset.label} API key`}
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

          {showBaseUrl && (
            <div className="mt-4">
              <label
                htmlFor="kerf-base-url"
                className="mono text-[10px] uppercase tracking-widest mb-2 block"
                style={{ color: MUTED }}
              >
                Base URL {byok.provider === "custom" ? "(required)" : ""}
              </label>
              <input
                id="kerf-base-url"
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder={preset.baseUrl ?? "https://your-endpoint.example.com/v1"}
                autoComplete="off"
                spellCheck={false}
                className="input-field w-full pb-2 text-base mono"
              />
            </div>
          )}

          <p className="mono text-[10px] mt-2 leading-relaxed" style={{ color: MUTED }}>
            {preset.note ? (
              <>
                {preset.note}
                <br />
              </>
            ) : null}
            Sent only as request headers on this run — never stored, never logged, never proxied.
            Saved in <span style={{ color: ACCENT }}>your browser only</span>.{" "}
            {preset.keyUrl && (
              <a
                href={preset.keyUrl}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-dotted"
                style={{ color: ACCENT }}
              >
                {byok.provider === "ollama" ? "install Ollama →" : "get a key →"}
              </a>
            )}
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
            disabled={!liveReady}
            className="btn-red px-8 py-4 mono text-sm uppercase tracking-widest font-bold inline-flex items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
            title={
              liveReady
                ? ""
                : `Add your ${preset.label} key to run live — or use the demo below.`
            }
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
          { tag: "Cluster map", text: "Maps where the category clusters today, by named competitor. Live web research on Anthropic keys; model knowledge on everything else." },
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
