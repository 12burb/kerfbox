"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ACCENT, ACCENT_DIM, MUTED } from "@/components/cmo/shared";
import {
  listArchive,
  deleteArchived,
  clearArchive,
  importToArchive,
  type ArchivedKerf,
} from "@/lib/archive";
import { parseKerfJson } from "@/lib/export";

/**
 * Browser-local archive index. kerf.box is account-free — saved kerfs live
 * only in this browser's localStorage (see lib/archive.ts), so this is a
 * client component that reads on mount. Nothing is fetched from a server.
 *
 * Supports importing a kerf from a previously-exported `.json` file, which
 * is how a kerf moves between browsers/devices without an account.
 */
export default function ArchivePage() {
  const [entries, setEntries] = useState<ArchivedKerf[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () => setEntries(listArchive());

  useEffect(() => {
    refresh();
    setLoaded(true);
  }, []);

  const onDelete = (id: string) => {
    deleteArchived(id);
    refresh();
  };

  const onClearAll = () => {
    if (
      typeof window !== "undefined" &&
      window.confirm("Clear every saved kerf from this browser? This can't be undone.")
    ) {
      clearArchive();
      refresh();
    }
  };

  const onImportClick = () => {
    setImportError(null);
    fileRef.current?.click();
  };

  const onFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset the input so choosing the same file twice still fires onChange.
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseKerfJson(text);
      if (!parsed) {
        setImportError("That file isn't a valid kerf export.");
        return;
      }
      const saved = importToArchive(parsed);
      if (!saved) {
        setImportError("Couldn't save the imported kerf to this browser.");
        return;
      }
      setImportError(null);
      refresh();
    } catch {
      setImportError("Couldn't read that file.");
    }
  };

  return (
    <div className="min-h-screen w-full">
      <div className="relative max-w-6xl mx-auto px-6 md:px-10 py-8 md:py-12">
        <header className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 flex items-center justify-center"
              style={{ background: ACCENT }}
            >
              <span className="mono text-black font-bold text-sm">K</span>
            </div>
            <div>
              <div className="serif text-xl leading-none" style={{ fontWeight: 600 }}>
                kerf<span style={{ color: ACCENT }}>.</span>box
              </div>
              <div
                className="mono text-[10px] uppercase tracking-widest"
                style={{ color: MUTED }}
              >
                Archive · this browser
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              onChange={onFileChosen}
              className="hidden"
            />
            <button
              onClick={onImportClick}
              className="mono text-[11px] uppercase tracking-widest px-3 py-2 border"
              style={{ borderColor: ACCENT_DIM, color: MUTED }}
            >
              import .json
            </button>
            {entries.length > 0 && (
              <button
                onClick={onClearAll}
                className="mono text-[11px] uppercase tracking-widest px-3 py-2 border"
                style={{ borderColor: ACCENT_DIM, color: MUTED }}
              >
                clear all
              </button>
            )}
            <Link
              href="/app"
              className="mono text-[11px] uppercase tracking-widest px-3 py-2 border"
              style={{ borderColor: ACCENT_DIM, color: MUTED }}
            >
              ← new kerf
            </Link>
          </div>
        </header>

        <p className="text-sm mb-8 max-w-2xl" style={{ color: MUTED }}>
          Saved kerfs live only in this browser — no account, nothing on a
          server. Export a kerf as <span style={{ color: ACCENT }}>.json</span>{" "}
          to keep it for good or open it on another device, then{" "}
          <span style={{ color: ACCENT }}>import .json</span> here.
        </p>

        {importError && (
          <div
            className="mb-6 p-3 mono text-[11px] uppercase tracking-widest"
            style={{ border: `1px dashed ${ACCENT}`, color: ACCENT }}
          >
            {importError}
          </div>
        )}

        {!loaded ? null : entries.length === 0 ? (
          <div
            className="mono text-xs uppercase tracking-widest py-16 text-center"
            style={{ color: MUTED }}
          >
            No kerfs in this browser yet. Cut one from{" "}
            <Link href="/app" className="underline" style={{ color: ACCENT }}>
              /app
            </Link>
            , or import a .json export.
          </div>
        ) : (
          <ul className="divide-y" style={{ borderColor: ACCENT_DIM }}>
            {entries.map((entry) => {
              const label = entry.kerf.wedge?.claim || entry.kerf.company_summary || "—";
              const when = new Date(entry.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
              return (
                <li key={entry.id} className="py-5">
                  <div className="flex items-baseline justify-between gap-6 mb-1">
                    <div
                      className="mono text-[10px] uppercase tracking-widest"
                      style={{ color: ACCENT }}
                    >
                      {when}
                    </div>
                    <div className="flex items-center gap-4">
                      {entry.url && (
                        <div
                          className="mono text-[10px] uppercase tracking-widest truncate max-w-[40vw]"
                          style={{ color: MUTED }}
                        >
                          {entry.url}
                        </div>
                      )}
                      <button
                        onClick={() => onDelete(entry.id)}
                        className="mono text-[10px] uppercase tracking-widest"
                        style={{ color: MUTED }}
                        aria-label="delete this kerf"
                      >
                        delete
                      </button>
                    </div>
                  </div>
                  <Link href={`/brief/${entry.id}`} className="block group">
                    <div
                      className="serif text-lg md:text-xl group-hover:underline"
                      style={{ fontWeight: 500 }}
                    >
                      {label}
                    </div>
                    {entry.audience && (
                      <div className="text-sm mt-1" style={{ color: MUTED }}>
                        {entry.audience}
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
