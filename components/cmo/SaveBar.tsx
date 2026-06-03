"use client";

import { useState } from "react";
import { Check, Clipboard, Download } from "lucide-react";
import { ACCENT, ACCENT_DIM, MUTED } from "./shared";
import type { Kerf } from "@/lib/schema";
import { downloadKerfJson, kerfToJson, copyText } from "@/lib/export";

export type SaveState = "idle" | "saving" | "saved" | "error";

type Props = {
  state: SaveState;
  onSave: () => void;
  kerf: Kerf;
  meta?: { url?: string; audience?: string };
};

/**
 * Archive + share affordance for a freshly cut Kerf.
 *
 * kerf.box is account-free, so "save" writes to the visitor's own browser
 * (localStorage) — no login, no server round-trip. The companion actions
 * make the kerf portable without a server: download it as a `.json` file
 * or copy that JSON to the clipboard. The file IS the shareable artifact;
 * import it back from the archive on any device.
 *
 * (Markdown export lives on the kerf masthead in BriefStage.tsx.)
 */
export default function SaveBar({ state, onSave, kerf, meta }: Props) {
  const [copied, setCopied] = useState(false);

  const onCopyJson = async () => {
    const ok = await copyText(kerfToJson(kerf, meta));
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  };

  return (
    <div
      className="mt-12 p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      style={{ border: `1px dashed ${ACCENT_DIM}` }}
    >
      <div>
        <div
          className="mono text-[10px] uppercase tracking-widest mb-1"
          style={{ color: ACCENT }}
        >
          ⎯ archive
        </div>
        <div className="text-sm" style={{ color: MUTED }}>
          {state === "saved"
            ? "Saved to this browser. Find it in your archive — or export to keep a copy."
            : state === "error"
            ? "Couldn't save to this browser. Export the JSON to keep it instead."
            : "Save this Kerf to your browser, or export it to share."}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onCopyJson}
          className={baseBtn + " border"}
          style={{ borderColor: ACCENT_DIM, color: copied ? ACCENT : MUTED }}
          aria-label="copy kerf as JSON"
        >
          {copied ? <Check size={12} /> : <Clipboard size={12} />}
          <span>{copied ? "copied" : "copy json"}</span>
        </button>
        <button
          onClick={() => downloadKerfJson(kerf, meta)}
          className={baseBtn + " border"}
          style={{ borderColor: ACCENT_DIM, color: MUTED }}
          aria-label="export kerf as JSON"
        >
          <Download size={12} />
          <span>export .json</span>
        </button>
        <button
          onClick={onSave}
          disabled={state === "saving" || state === "saved"}
          className={baseBtn + " disabled:opacity-50"}
          style={{
            background: state === "saved" ? ACCENT_DIM : ACCENT,
            color: state === "saved" ? MUTED : "#000",
            fontWeight: 600,
          }}
        >
          {state === "saving"
            ? "saving…"
            : state === "saved"
            ? "saved ✓"
            : state === "error"
            ? "retry save"
            : "save kerf →"}
        </button>
      </div>
    </div>
  );
}

const baseBtn =
  "mono text-xs uppercase tracking-widest px-4 py-3 inline-flex items-center gap-2";
