"use client";

import { useEffect, useState } from "react";
import { Check, ChevronRight, Copy as CopyIcon, Download, Quote, Shield } from "lucide-react";
import { ACCENT, ACCENT_DIM, BG_2, BG_3, INK, MUTED, platformStyle } from "./shared";
import type { Kerf, CalendarEntry } from "@/lib/schema";
import { kerfSlug, kerfToMarkdown, downloadText } from "@/lib/export";

type Props = {
  kerf: Kerf;
  onEntryClick: (entry: CalendarEntry) => void;
  /**
   * Epoch ms this kerf was generated/saved — shown in the masthead. When
   * omitted (fresh runs, demo carousel), today's date is filled in after
   * mount: this component is server-rendered on the landing page, and an
   * inline `new Date()` hydrates to a mismatch whenever the server's UTC
   * date differs from the visitor's local date.
   */
  generatedAt?: number;
  /** Originating url/audience — threaded into the markdown export header. */
  meta?: { url?: string; audience?: string };
  /**
   * When false, calendar entries render as static rows (no click, no
   * hover transform, no chevron, no "click → generate copy" hint).
   * Used by the landing-page demo carousel where we don't have a BYOK
   * key to generate copy with — clickable buttons that error on click
   * are worse than visibly inert rows.
   * Defaults to true so the /app surface keeps its existing behavior.
   */
  interactive?: boolean;
};

/**
 * Renders a Kerf as the v0.2 strategic artifact.
 *
 * Reading order is opinionated — the user sees the cluster map first
 * (where everyone is), then the kerf (the cut), then the wedge (claim
 * + moat). This makes the document read as an argument, not a list.
 *
 * The moat block is rendered with a shield icon and accent border because
 * it's the load-bearing claim — the route refused to ship if it was
 * undefendable, so by the time it renders here, it has earned the emphasis.
 */
export default function KerfStage({
  kerf,
  onEntryClick,
  generatedAt,
  meta,
  interactive = true,
}: Props) {
  const [copiedClaim, setCopiedClaim] = useState(false);
  // Client-side "now" for kerfs without a stored timestamp. Starts null so
  // server and first client render agree (no date), then fills in.
  const [mountedNow, setMountedNow] = useState<number | null>(null);
  useEffect(() => {
    setMountedNow(Date.now());
  }, []);
  const stamp = generatedAt ?? mountedNow;
  const dateLabel =
    stamp === null
      ? ""
      : new Date(stamp).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });

  const exportMarkdown = () => {
    const md = kerfToMarkdown(kerf, meta);
    const filename = `kerf-${kerfSlug(kerf)}.md`;
    downloadText(filename, md);
  };

  const copyClaim = async () => {
    try {
      await navigator.clipboard.writeText(kerf.wedge.claim);
      setCopiedClaim(true);
      setTimeout(() => setCopiedClaim(false), 1600);
    } catch {
      // silent fail
    }
  };

  return (
    <div className="relative reveal">
      {/* Masthead */}
      <div
        className="flex items-end justify-between mb-10 pb-6"
        style={{ borderBottom: `1px solid ${ACCENT_DIM}` }}
      >
        <div>
          <div className="mono text-[10px] uppercase tracking-widest mb-2" style={{ color: ACCENT }}>
            The Kerf{dateLabel ? ` · ${dateLabel}` : ""}
          </div>
          <h2 className="serif text-2xl md:text-3xl" style={{ fontWeight: 400 }}>
            {kerf.company_summary}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyClaim}
            className="mono text-[10px] uppercase tracking-widest px-3 py-2 border flex items-center gap-1.5 transition-colors"
            style={{ borderColor: ACCENT_DIM, color: copiedClaim ? ACCENT : MUTED }}
            aria-label="copy wedge claim"
          >
            {copiedClaim ? <Check size={12} /> : <CopyIcon size={12} />}
            <span>{copiedClaim ? "copied" : "copy claim"}</span>
          </button>
          <button
            onClick={exportMarkdown}
            className="mono text-[10px] uppercase tracking-widest px-3 py-2 flex items-center gap-1.5"
            style={{ background: ACCENT, color: "#000", fontWeight: 600 }}
            aria-label="export kerf as markdown"
          >
            <Download size={12} />
            <span>export .md</span>
          </button>
        </div>
      </div>

      {/* Cluster map — where the category is today */}
      {kerf.cluster_map.length > 0 && (
        <div className="grid md:grid-cols-12 gap-8 mb-16">
          <div className="md:col-span-2">
            <div className="mono text-[10px] uppercase tracking-widest" style={{ color: ACCENT }}>
              ⎯ 01 / Cluster Map
            </div>
            <div className="mono text-[10px] mt-2" style={{ color: MUTED }}>
              where everyone is
            </div>
          </div>
          <div className="md:col-span-10 grid md:grid-cols-2 gap-4">
            {kerf.cluster_map.map((c, i) => (
              <div
                key={i}
                className="p-5"
                style={{ background: BG_2, border: `1px solid ${ACCENT_DIM}` }}
              >
                <div className="mono text-[10px] uppercase tracking-widest mb-2" style={{ color: ACCENT }}>
                  Cluster {String(i + 1).padStart(2, "0")}
                </div>
                <h5 className="serif text-xl mb-2 leading-tight" style={{ fontWeight: 600 }}>
                  {c.cluster}
                </h5>
                <div className="mono text-[11px] mb-3 flex flex-wrap gap-1.5">
                  {c.examples.map((ex, j) => (
                    <span
                      key={j}
                      className="px-1.5 py-0.5"
                      style={{ background: BG_3, color: INK }}
                    >
                      {ex}
                    </span>
                  ))}
                </div>
                <p className="text-sm leading-relaxed" style={{ color: MUTED }}>
                  {c.pattern}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* The Kerf — the cut */}
      <div className="grid md:grid-cols-12 gap-8 mb-16">
        <div className="md:col-span-2">
          <div className="mono text-[10px] uppercase tracking-widest" style={{ color: ACCENT }}>
            ⎯ 02 / The Cut
          </div>
          <div className="mono text-[10px] mt-2" style={{ color: MUTED }}>
            between the clusters
          </div>
        </div>
        <div className="md:col-span-10">
          <div className="relative">
            <Quote size={40} className="absolute -top-2 -left-2 opacity-10" style={{ color: ACCENT }} />
            <h3
              className="serif italic text-3xl md:text-5xl leading-[1.05] mb-6 pl-8"
              style={{ fontWeight: 400 }}
            >
              &ldquo;{kerf.kerf.cut}&rdquo;
            </h3>
            <div className="pl-8">
              <div className="mono text-[10px] uppercase tracking-widest mb-2" style={{ color: MUTED }}>
                Why now
              </div>
              <p className="text-base md:text-lg" style={{ color: INK, maxWidth: "48rem" }}>
                {kerf.kerf.why_now}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* The Wedge — claim, proof, moat */}
      <div className="grid md:grid-cols-12 gap-8 mb-16">
        <div className="md:col-span-2">
          <div className="mono text-[10px] uppercase tracking-widest" style={{ color: ACCENT }}>
            ⎯ 03 / The Wedge
          </div>
          <div className="mono text-[10px] mt-2" style={{ color: MUTED }}>
            what fits the cut
          </div>
        </div>
        <div className="md:col-span-10">
          <div
            className="p-6 md:p-8 mb-4"
            style={{ background: BG_2, border: `1px solid ${ACCENT_DIM}` }}
          >
            <div className="mono text-[10px] uppercase tracking-widest mb-3" style={{ color: ACCENT }}>
              Claim
            </div>
            <p className="serif text-2xl md:text-3xl leading-tight mb-6" style={{ fontWeight: 600 }}>
              {kerf.wedge.claim}
            </p>
            {kerf.wedge.proof.length > 0 && (
              <>
                <div className="mono text-[10px] uppercase tracking-widest mb-3" style={{ color: ACCENT }}>
                  Proof
                </div>
                <ul className="space-y-2 mb-2">
                  {kerf.wedge.proof.map((p, i) => (
                    <li key={i} className="text-sm md:text-base flex gap-3" style={{ color: INK }}>
                      <span className="mono text-xs mt-1" style={{ color: ACCENT }}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          {/* Moat — the load-bearing claim, rendered with emphasis */}
          <div
            className="p-6 md:p-8 relative"
            style={{
              background: BG_2,
              border: `2px solid ${ACCENT}`,
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Shield size={14} style={{ color: ACCENT }} />
              <div className="mono text-[10px] uppercase tracking-widest" style={{ color: ACCENT }}>
                Moat — why competitors can&rsquo;t follow
              </div>
            </div>
            <p className="text-sm md:text-base leading-relaxed" style={{ color: INK }}>
              {kerf.wedge.moat}
            </p>
          </div>
        </div>
      </div>

      {/* Signals */}
      {kerf.signals.length > 0 && (
        <div className="grid md:grid-cols-12 gap-8 mb-16">
          <div className="md:col-span-2">
            <div className="mono text-[10px] uppercase tracking-widest" style={{ color: ACCENT }}>
              ⎯ 04 / Signals
            </div>
            <div className="mono text-[10px] mt-2" style={{ color: MUTED }}>
              receipts
            </div>
          </div>
          <div className="md:col-span-10 space-y-3">
            {kerf.signals.map((f, i) => (
              <div key={i} className="mono text-xs flex gap-3" style={{ color: MUTED }}>
                <span style={{ color: ACCENT }}>◆</span>
                <div className="flex-1">
                  <div>
                    <span style={{ color: INK }}>{f.source}:</span> {f.finding}
                  </div>
                  {f.citations && f.citations.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {f.citations.map((c, j) => {
                        let host = "";
                        try {
                          host = new URL(c.url).hostname.replace(/^www\./, "");
                        } catch {
                          host = c.url;
                        }
                        return (
                          <a
                            key={j}
                            href={c.url}
                            target="_blank"
                            rel="noreferrer"
                            title={c.title}
                            className="mono text-[10px] px-1.5 py-0.5 border hover:bg-white/5 transition-colors"
                            style={{ borderColor: ACCENT_DIM, color: ACCENT }}
                          >
                            {host}
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Concepts */}
      <div className="mb-16">
        <div
          className="flex items-baseline justify-between mb-6 pb-3"
          style={{ borderBottom: `1px solid ${ACCENT_DIM}` }}
        >
          <h4 className="mono text-xs uppercase tracking-widest" style={{ color: ACCENT }}>
            ⎯ 05 / Concepts
          </h4>
          <span className="mono text-[10px]" style={{ color: MUTED }}>
            03 ideas — each embodies the wedge
          </span>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {kerf.concepts.map((c, i) => (
            <div
              key={c.id}
              className="p-6 relative group transition-all"
              style={{ background: BG_2, border: `1px solid ${ACCENT_DIM}` }}
            >
              <div className="mono text-[10px] uppercase tracking-widest mb-4" style={{ color: ACCENT }}>
                Concept {String(i + 1).padStart(2, "0")}
              </div>
              <h5 className="serif text-2xl mb-4 leading-tight" style={{ fontWeight: 600 }}>
                {c.name}
              </h5>
              <p className="text-sm leading-relaxed mb-4" style={{ color: INK }}>
                {c.hook}
              </p>
              <div className="pt-4 mt-4" style={{ borderTop: `1px dashed ${ACCENT_DIM}` }}>
                <div className="mono text-[10px] uppercase tracking-widest mb-2" style={{ color: ACCENT }}>
                  Embodies the wedge
                </div>
                <p className="text-xs leading-relaxed mb-3" style={{ color: INK }}>
                  {c.embodies_wedge}
                </p>
                <div className="mono text-[10px] uppercase tracking-widest mb-2" style={{ color: MUTED }}>
                  Why now
                </div>
                <p className="text-xs leading-relaxed" style={{ color: MUTED }}>
                  {c.why_now}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar */}
      <div className="mb-8">
        <div
          className="flex items-baseline justify-between mb-6 pb-3"
          style={{ borderBottom: `1px solid ${ACCENT_DIM}` }}
        >
          <h4 className="mono text-xs uppercase tracking-widest" style={{ color: ACCENT }}>
            ⎯ 06 / 7-Day Calendar
          </h4>
          <span className="mono text-[10px]" style={{ color: MUTED }}>
            {interactive ? "click an entry → generate copy" : "preview · 7 platform-ready posts"}
          </span>
        </div>
        <div className="space-y-1">
          {kerf.calendar.map((entry, i) => {
            const platform = platformStyle(entry.platform);
            const conceptIdx = kerf.concepts.findIndex((c) => c.id === entry.concept_id);
            const rowClasses = interactive
              ? "w-full text-left p-4 md:p-5 grid grid-cols-12 gap-4 items-center group transition-all hover:translate-x-1"
              : "w-full text-left p-4 md:p-5 grid grid-cols-12 gap-4 items-center";
            const rowStyle = { background: BG_2, border: `1px solid ${ACCENT_DIM}` };
            const inner = (
              <>
                <div className="col-span-2 md:col-span-1">
                  <div className="serif text-2xl leading-none" style={{ fontWeight: 600 }}>
                    {entry.day}
                  </div>
                  <div className="mono text-[10px] mt-1" style={{ color: MUTED }}>
                    {entry.time}
                  </div>
                </div>
                <div className="col-span-3 md:col-span-2">
                  <div
                    className="mono text-[10px] uppercase tracking-widest px-2 py-1 inline-block"
                    style={{ background: platform.bg, color: platform.fg }}
                  >
                    {platform.label}
                  </div>
                </div>
                <div className="col-span-7 md:col-span-7 min-w-0">
                  <div className="text-sm md:text-base mb-1 truncate md:whitespace-normal">
                    {entry.post_idea}
                  </div>
                  <div className="mono text-[11px] flex items-start gap-2" style={{ color: MUTED }}>
                    <span style={{ color: ACCENT }}>↳</span>
                    <span className="truncate md:whitespace-normal">{entry.rationale}</span>
                  </div>
                </div>
                <div className="hidden md:flex col-span-1 items-center justify-center">
                  <span
                    className="mono text-[10px] px-2 py-1"
                    style={{ background: BG_3, color: MUTED }}
                  >
                    C{conceptIdx + 1}
                  </span>
                </div>
                <div className="col-span-12 md:col-span-1 flex justify-end">
                  {interactive ? (
                    <ChevronRight
                      size={18}
                      style={{ color: ACCENT }}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  ) : (
                    <span
                      className="mono text-[10px] uppercase tracking-widest"
                      style={{ color: MUTED }}
                    >
                      preview
                    </span>
                  )}
                </div>
              </>
            );
            return interactive ? (
              <button
                key={i}
                onClick={() => onEntryClick(entry)}
                className={rowClasses}
                style={rowStyle}
              >
                {inner}
              </button>
            ) : (
              <div key={i} className={rowClasses} style={rowStyle}>
                {inner}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer closer */}
      <div className="text-center pt-10" style={{ borderTop: `1px dashed ${ACCENT_DIM}` }}>
        <p className="serif italic text-2xl md:text-3xl mb-2" style={{ fontWeight: 300 }}>
          Strategy is not a story.
        </p>
        <p className="serif text-2xl md:text-3xl" style={{ fontWeight: 600, color: ACCENT }}>
          Strategy is a cut.
        </p>
      </div>
    </div>
  );
}
