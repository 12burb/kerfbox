import Link from "next/link";

/**
 * 404 boundary. Shape mirrors app/error.tsx so the recovery surfaces feel
 * like one system. Brand palette (red accent) kept in lockstep with
 * components/cmo/shared.ts and app/globals.css.
 */

const ACCENT = "#ff1744";
const ACCENT_DIM = "#8a0a22";
const MUTED = "#7a7a82";

export const metadata = {
  title: "Not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
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
          ⎯ 404
        </div>
        <h1 className="serif text-2xl md:text-3xl mb-3" style={{ fontWeight: 500 }}>
          No cut here.
        </h1>
        <p className="text-sm mb-6" style={{ color: MUTED }}>
          This page doesn&apos;t exist — or moved. Head back to the landing
          page and start from the kerf.
        </p>
        <div className="flex gap-3">
          <Link
            href="/"
            className="mono text-[11px] uppercase tracking-widest px-4 py-2"
            style={{ background: ACCENT, color: "#000" }}
          >
            ← home
          </Link>
          <Link
            href="/app"
            className="mono text-[11px] uppercase tracking-widest px-4 py-2 border"
            style={{ borderColor: ACCENT_DIM, color: MUTED }}
          >
            open app
          </Link>
        </div>
      </div>
    </div>
  );
}
