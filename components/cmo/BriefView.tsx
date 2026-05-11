"use client";

import { useEffect, useState } from "react";
import KerfStage from "./BriefStage";
import CopyModal from "./CopyModal";
import { CopySchema, type Kerf, type CalendarEntry, type Copy } from "@/lib/schema";

/**
 * Saved-kerf view. Reads the BYOK key from localStorage so a logged-in
 * user revisiting their archive can still hit /api/copy without paying
 * out of our server credit pool. Falls back to session auth if no key
 * is stored — the server then runs on its own credentials. The session
 * fallback is the reason this component exists separately from the
 * working-app variant in /app/page.tsx.
 */
export default function KerfView({ kerf }: { kerf: Kerf }) {
  const [selectedEntry, setSelectedEntry] = useState<CalendarEntry | null>(null);
  const [copyData, setCopyData] = useState<Copy | null>(null);
  const [copyLoading, setCopyLoading] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [byokKey, setByokKey] = useState<string>("");

  // Hydrate BYOK from localStorage. Reading lazily on mount keeps the
  // component SSR-safe — localStorage is browser-only.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("kerfbox.byokKey") ?? "";
      if (stored) setByokKey(stored);
    } catch {
      // localStorage can throw in restrictive privacy modes — silently fall back.
    }
  }, []);

  const generateCopy = async (entry: CalendarEntry) => {
    setSelectedEntry(entry);
    setCopyData(null);
    setCopyError(null);
    setCopyLoading(true);
    try {
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (byokKey.trim()) {
        headers["X-Anthropic-Key"] = byokKey.trim();
      }
      const res = await fetch("/api/copy", {
        method: "POST",
        headers,
        body: JSON.stringify({ kerf, entry }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = typeof body?.error === "string" ? body.error : `API returned ${res.status}.`;
        throw new Error(msg);
      }
      const { copy } = await res.json();
      const parsed = CopySchema.safeParse(copy);
      if (!parsed.success) throw new Error("Malformed copy payload.");
      setCopyData(parsed.data);
    } catch (err) {
      setCopyData(null);
      setCopyError(err instanceof Error ? err.message : "Copy generation failed.");
    } finally {
      setCopyLoading(false);
    }
  };

  return (
    <>
      <KerfStage kerf={kerf} onEntryClick={generateCopy} />
      {selectedEntry && (
        <CopyModal
          entry={selectedEntry}
          copy={copyData}
          loading={copyLoading}
          error={copyError}
          onRetry={() => generateCopy(selectedEntry)}
          onClose={() => {
            setSelectedEntry(null);
            setCopyError(null);
          }}
        />
      )}
    </>
  );
}
