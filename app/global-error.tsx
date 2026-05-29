"use client";

/**
 * Last-resort boundary. Catches errors thrown in the root layout itself —
 * the one case app/error.tsx can't handle, because that error happens
 * *above* the normal layout/error tree. Next renders this in place of the
 * whole document, so it MUST supply its own <html> and <body>, and it
 * can't rely on app/globals.css classes being present. Everything is
 * inlined; brand palette mirrors components/cmo/shared.ts.
 */

import { useEffect } from "react";

const BG = "#0a0a0c";
const INK = "#f5f1e8";
const ACCENT = "#ff1744";
const ACCENT_DIM = "#8a0a22";
const MUTED = "#7a7a82";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[global-error]", error.digest, error.message);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: BG,
          color: INK,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: 520,
            width: "100%",
            padding: 40,
            border: `1px solid ${ACCENT_DIM}`,
          }}
        >
          <div
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 10,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: ACCENT,
              marginBottom: 16,
            }}
          >
            ⎯ something broke
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 500, margin: "0 0 12px" }}>
            The kerf slipped.
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.5, color: MUTED, margin: "0 0 24px" }}>
            A fault reached the outermost boundary. Retry, or reload the
            landing page. If it persists, the digest below helps support pin
            it down.
          </p>
          {error.digest && (
            <div
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: 10,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: MUTED,
                background: "rgba(255,255,255,0.04)",
                padding: 12,
                marginBottom: 24,
              }}
            >
              digest: {error.digest}
            </div>
          )}
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={reset}
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: 11,
                letterSpacing: 2,
                textTransform: "uppercase",
                padding: "8px 16px",
                background: ACCENT,
                color: "#000",
                border: "none",
                cursor: "pointer",
              }}
            >
              retry
            </button>
            <a
              href="/"
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: 11,
                letterSpacing: 2,
                textTransform: "uppercase",
                padding: "8px 16px",
                border: `1px solid ${ACCENT_DIM}`,
                color: MUTED,
                textDecoration: "none",
              }}
            >
              ← home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
