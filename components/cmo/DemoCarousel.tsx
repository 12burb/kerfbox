"use client";

import { useState } from "react";
import KerfStage from "./BriefStage";
import { ACCENT, ACCENT_DIM, BG_2, MUTED } from "./shared";
import { DEMOS, type DemoId } from "@/lib/demos";

/**
 * Three pre-baked Kerfs, tab-switchable, embedded on the landing page.
 *
 * The landing's main credibility asset: visitors see the actual product
 * output (cluster map → kerf → wedge with structural moat → calendar)
 * across three verticals before being asked to type anything. Reuses
 * `KerfStage` so the demo renders identically to the live result page.
 *
 * Calendar-entry clicks are no-ops here — the demo is read-only. We
 * deliberately don't wire copy generation: the goal of the demo is to
 * showcase the strategic artifact, not to spin up unauthenticated
 * inference.
 */
export default function DemoCarousel() {
  const [activeId, setActiveId] = useState<DemoId>("gaming");
  const active = DEMOS.find((d) => d.id === activeId) ?? DEMOS[0];

  return (
    <div>
      {/* Tab strip — proper tablist semantics so screen readers announce
          "tab 1 of 3" rather than three identical-looking buttons. */}
      <div role="tablist" aria-label="demo verticals" className="flex flex-wrap items-stretch gap-2 mb-6">
        {DEMOS.map((d) => {
          const isActive = d.id === activeId;
          return (
            <button
              key={d.id}
              role="tab"
              id={`demo-tab-${d.id}`}
              aria-selected={isActive}
              aria-controls={`demo-panel-${d.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveId(d.id)}
              className="text-left px-4 py-3 transition-colors flex-1 min-w-[220px]"
              style={{
                background: isActive ? "rgba(255,23,68,0.06)" : BG_2,
                border: `1px solid ${isActive ? ACCENT : ACCENT_DIM}`,
                borderLeftWidth: isActive ? 3 : 1,
                color: isActive ? ACCENT : MUTED,
              }}
            >
              <div className="mono text-[10px] uppercase tracking-widest mb-1">
                {d.vertical} · demo
              </div>
              <div
                className="serif text-base leading-tight"
                style={{ color: isActive ? "#fff" : MUTED, fontWeight: 500 }}
              >
                {d.brand_label}
              </div>
              <div className="text-xs mt-1 leading-snug" style={{ color: MUTED }}>
                {d.short_description}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Kerf — rendered with the same component as the live result */}
      <div
        role="tabpanel"
        id={`demo-panel-${active.id}`}
        aria-labelledby={`demo-tab-${active.id}`}
        className="p-6 md:p-10 relative"
        style={{ background: BG_2, border: `1px solid ${ACCENT_DIM}` }}
      >
        <div
          className="absolute -top-3 left-6 mono text-[10px] uppercase tracking-widest px-2 py-1"
          style={{ background: ACCENT, color: "#000", fontWeight: 600 }}
        >
          example output · read-only
        </div>
        <KerfStage kerf={active.kerf} onEntryClick={() => {}} interactive={false} />
      </div>
    </div>
  );
}
