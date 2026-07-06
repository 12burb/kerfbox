"use client";

import { useEffect, useState } from "react";
import KerfStage from "./BriefStage";
import CopyModal from "./CopyModal";
import { CopySchema, type Kerf, type CalendarEntry, type Copy } from "@/lib/schema";

/**
 * Saved-kerf view. Account-free: reads the BYOK key from this browser's
 * localStorage so a visitor revisiting their archive can regenerate copy
 * for a saved kerf without re-pasting the key. If no key is stored, the
 * request asks for canned content via `demo: true` — a keyless request
 * without that flag would 401, and there is no login or session to fall
 * back on. This is a lighter variant of the copy flow in /app/page.tsx,
 * scoped to a kerf loaded from the archive rather than one freshly cut.
 */
export default function KerfView({
  kerf,
  generatedAt,
  meta,
}: {
  kerf: Kerf;
  /** Epoch ms the kerf was saved — shown in KerfStage's masthead. */
  generatedAt?: number;
  /** Originating url/audience — threaded into the markdown export. */
  meta?: { url?: string; audience?: string };
}) {
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
      const key = byokKey.trim();
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (key) {
        headers["X-Anthropic-Key"] = key;
      }
      const res = await fetch("/api/copy", {
        method: "POST",
        headers,
        body: JSON.stringify(key ? { kerf, entry } : { kerf, entry, demo: true }),
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
      <KerfStage kerf={kerf} onEntryClick={generateCopy} generatedAt={generatedAt} meta={meta} />
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
