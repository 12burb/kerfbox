"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import KerfView from "@/components/cmo/BriefView";
import { getArchived, type ArchivedKerf } from "@/lib/archive";
import { ACCENT, ACCENT_DIM, MUTED } from "@/components/cmo/shared";

/**
 * Saved-kerf detail view. Account-free: the kerf is read from this
 * browser's localStorage archive by id (see lib/archive.ts) — there is no
 * server fetch and no auth. If the id isn't in this browser (e.g. the link
 * was opened on a different device), we say so and point back to the
 * archive, where a kerf can be imported from its exported `.json`.
 */
export default function KerfDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [entry, setEntry] = useState<ArchivedKerf | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setEntry(getArchived(id));
    setLoaded(true);
  }, [id]);

  if (loaded && !entry) {
    return (
      <FallbackShell
        title="Not in this browser"
        body="This kerf isn't saved in this browser. Saved kerfs are browser-local — open it where you saved it, or import its exported .json from the archive."
      />
    );
  }

  if (!entry) {
    // Pre-hydration: render nothing to avoid a flash of the fallback.
    return <div className="min-h-screen w-full" />;
  }

  const when = new Date(entry.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

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
                {when}
                {entry.url ? ` · ${entry.url}` : ""}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/briefs"
              className="mono text-[11px] uppercase tracking-widest px-3 py-2 border"
              style={{ borderColor: ACCENT_DIM, color: MUTED }}
            >
              ← archive
            </Link>
          </div>
        </header>
        <KerfView kerf={entry.kerf} />
      </div>
    </div>
  );
}

function FallbackShell({ title, body }: { title: string; body: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-10">
      <div className="text-center space-y-3 max-w-md">
        <div
          className="mono text-[10px] uppercase tracking-widest"
          style={{ color: ACCENT }}
        >
          ⎯ {title}
        </div>
        <div className="serif text-xl" style={{ fontWeight: 500 }}>
          {body}
        </div>
        <div className="flex items-center justify-center gap-2 pt-2">
          <Link
            href="/briefs"
            className="inline-block mono text-[11px] uppercase tracking-widest px-3 py-2 border"
            style={{ borderColor: ACCENT_DIM, color: MUTED }}
          >
            ← archive
          </Link>
          <Link
            href="/app"
            className="inline-block mono text-[11px] uppercase tracking-widest px-3 py-2 border"
            style={{ borderColor: ACCENT_DIM, color: MUTED }}
          >
            new kerf
          </Link>
        </div>
      </div>
    </main>
  );
}
