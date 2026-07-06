"use client";

import { Check, Loader2, Terminal } from "lucide-react";
import { ACCENT, ACCENT_DIM, BG_2, INK, MUTED, ResearchStep } from "./shared";

type Props = {
  url: string;
  audience: string;
  researchSteps: ResearchStep[];
  elapsed: number;
};

export default function WorkingStage({ url, audience, researchSteps, elapsed }: Props) {
  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Terminal size={14} style={{ color: ACCENT }} />
          <span className="mono text-xs uppercase tracking-widest">Agent · Research</span>
          <div className="w-2 h-2 rounded-full pulse" style={{ background: ACCENT }} />
        </div>
        <div className="mono text-xs" style={{ color: MUTED }}>
          t+{String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}
        </div>
      </div>

      <div
        className="relative grid-bg border p-6 md:p-10 min-h-[480px]"
        style={{ borderColor: ACCENT_DIM, background: BG_2 }}
      >
        <div className="noise absolute inset-0" />

        <div className="relative">
          <div className="mono text-[11px] mb-6" style={{ color: MUTED }}>
            $ kerf-agent run --url &quot;{url}&quot; --audience &quot;{audience.slice(0, 40)}
            {audience.length > 40 ? "…" : ""}&quot;
          </div>

          <div className="space-y-2">
            {researchSteps.map((step, i) => (
              <div key={i} className="reveal flex items-start gap-3 mono text-sm">
                <div className="mt-[6px] flex-shrink-0 w-4 flex items-center justify-center">
                  {step.status === "running" && (
                    <Loader2 size={12} className="spin-slow" style={{ color: ACCENT }} />
                  )}
                  {step.status === "done" && <Check size={13} style={{ color: ACCENT }} />}
                  {step.status === "pending" && (
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: MUTED }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span style={{ color: step.status === "pending" ? MUTED : INK }}>
                      ▸ {step.label}
                    </span>
                    {step.status === "running" && (
                      <span className="cursor" style={{ color: ACCENT }}>
                        ▋
                      </span>
                    )}
                  </div>
                  {step.finding && (
                    <div
                      className="text-xs mt-1 pl-3 border-l"
                      style={{ color: MUTED, borderColor: ACCENT_DIM }}
                    >
                      {step.finding}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {researchSteps.length >= 5 && (
            <div className="reveal mt-8 pt-6" style={{ borderTop: `1px dashed ${ACCENT_DIM}` }}>
              <div className="mono text-xs uppercase tracking-widest" style={{ color: ACCENT }}>
                Cutting the kerf
                <span className="cursor">▋</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 mono text-[11px] flex items-center gap-4" style={{ color: MUTED }}>
        {/* Deliberately generic: the actual model id is a server-side env
            override (KERFBOX_STRATEGY_MODEL) the client can't know. */}
        <span>Model · Claude</span>
        <span>·</span>
        <span>Tools · web_search</span>
        <span>·</span>
        <span>Output · JSON</span>
      </div>
    </div>
  );
}
