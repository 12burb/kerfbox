"use client";

/**
 * Root-level error boundary. Catches any uncaught render exception in
 * the page tree and shows a recovery card instead of Next.js's default
 * white-screen. Server-side errors that happen *before* the React tree
 * boots route to `app/global-error.tsx` if present, or the framework's
 * fallback otherwise — keep both layers shaped consistently.
 *
 * `reset()` is provided by Next: it re-renders the failed segment from
 * scratch. Often enough to recover from a transient bug in a Suspense
 * boundary or an aborted stream landing in a stale state.
 */

import { useEffect } from "react";
import Link from "next/link";

const ACCENT = "#ff7a3d";
const ACCENT_DIM = "#8a4a2a";
const MUTED = "#9a8e75";

export default function GlobalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Next.js already logs to its own pipeline, but stash a console line
    // so a user with devtools open can grab the digest for a support
    // ticket without us shipping it into the UI.
    // eslint-disable-next-line no-console
    console.error("[error-boundary]", error.digest, error.message);
  }, [error]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-6">
      <div
        className="max-w-lg w-full p-8 md:p-10"
        style={{ border: `1px solid ${ACCENT_DIM}` }}
      >
        <div
          className="mono text-[10px] uppercase tracking-widest mb-4"
          style={{ color: ACCENT }}
        >
          ⎯ something broke
        </div>
        <h1
          className="serif text-2xl md:text-3xl mb-3"
          style={{ fontWeight: 500 }}
        >
          The kerf slipped.
        </h1>
        <p className="text-sm mb-6" style={{ color: MUTED }}>
          A render error reached the boundary. Retry, or head back to the
          landing page. If it keeps happening, the digest below helps support
          pin it down.
        </p>
        {error.digest && (
          <div
            className="mono text-[10px] uppercase tracking-widest mb-6 p-3"
            style={{ background: "rgba(255,255,255,0.04)", color: MUTED }}
          >
            digest: {error.digest}
          </div>
        )}
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="mono text-[11px] uppercase tracking-widest px-4 py-2"
            style={{ background: ACCENT, color: "#000" }}
          >
            retry
          </button>
          <Link
            href="/"
            className="mono text-[11px] uppercase tracking-widest px-4 py-2 border"
            style={{ borderColor: ACCENT_DIM, color: MUTED }}
          >
            ← home
          </Link>
        </div>
      </div>
    </div>
  );
}
