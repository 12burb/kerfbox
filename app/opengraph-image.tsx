import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";

/**
 * Dynamically-rendered Open Graph / Twitter card. Next auto-wires the
 * og:image and twitter:image tags to this route, so layout.tsx doesn't
 * need to reference it. Edge runtime keeps cold starts fast.
 *
 * Brand palette mirrors components/cmo/shared.ts (red accent on near-black).
 * We use the default system font — pulling Fraunces/JetBrains here would
 * mean bundling font binaries for a marginal visual gain on a card.
 */
export const runtime = "edge";
export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#0a0a0c";
const INK = "#f5f1e8";
const ACCENT = "#ff1744";
const MUTED = "#7a7a82";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: BG,
          padding: "72px 80px",
          // Subtle accent frame.
          borderTop: `10px solid ${ACCENT}`,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 24,
            letterSpacing: 8,
            textTransform: "uppercase",
            color: ACCENT,
            fontWeight: 700,
          }}
        >
          ⎯ kerf.box
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 88,
              lineHeight: 1.05,
              color: INK,
              fontWeight: 600,
              letterSpacing: -2,
            }}
          >
            Strategy is a cut,
          </div>
          <div
            style={{
              fontSize: 88,
              lineHeight: 1.05,
              color: ACCENT,
              fontWeight: 600,
              letterSpacing: -2,
            }}
          >
            not a story.
          </div>
          <div
            style={{
              marginTop: 32,
              fontSize: 30,
              lineHeight: 1.35,
              color: MUTED,
              maxWidth: 900,
            }}
          >
            Map the cluster. Cut the kerf. Ship a wedge with a moat — or the
            system refuses to ship.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 22,
            color: MUTED,
            letterSpacing: 1,
          }}
        >
          <span>{SITE_URL.replace(/^https?:\/\//, "")}</span>
          <span>MCP · OpenAPI · BYOK</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
