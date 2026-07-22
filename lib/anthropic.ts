import Anthropic from "@anthropic-ai/sdk";

/**
 * Resolve the server-side Anthropic key.
 *
 * Precedence:
 *   1. KERFBOX_ANTHROPIC_KEY — the namespaced variable, matching the MCP
 *      package's KERFBOX_BYOK_ANTHROPIC_KEY convention.
 *   2. ANTHROPIC_API_KEY — legacy/back-compat. Honored without warning
 *      because many tools auto-detect it; we don't want to spam Vercel
 *      logs on every cold start.
 *
 * Returns null when neither is set. Account-free: with no server key, a
 * live request that carries no BYOK header and did not ask for demo is
 * surfaced as a 401 by the route handlers (not a silent fall-through to
 * demo content) — see app/api/strategy and app/api/copy.
 */
function serverAnthropicKey(): string | null {
  // `||`, not `??`: an env var set to "" (easy to do in Vercel's dashboard
  // or a .env line like `KERFBOX_ANTHROPIC_KEY=`) should fall through to
  // the next candidate, not short-circuit to an empty key.
  return process.env.KERFBOX_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY || null;
}

/**
 * Build an Anthropic client. If a `byok` key is passed (typically pulled from
 * the `X-Anthropic-Key` request header), it overrides our env key — the user
 * pays Anthropic directly. Otherwise we fall back to our own key.
 *
 * Throws if no key is available.
 */
export function getAnthropic(byok?: string | null): Anthropic {
  const apiKey = byok || serverAnthropicKey();
  if (!apiKey) {
    throw new Error("No Anthropic key available (no BYOK header, no server env).");
  }
  return new Anthropic({ apiKey });
}

/** True if the server has its own fallback Anthropic key. */
export function hasAnthropicKey(): boolean {
  return Boolean(serverAnthropicKey());
}

// BYOK header parsing lives in lib/providers.ts (resolveByok) as of the
// multi-provider release — it handles X-Provider/X-Api-Key/X-Model/
// X-Base-Url plus the legacy X-Anthropic-Key path, including the sk-ant-
// shape check and the "bare X-Api-Key is ambiguous, reject it" rule that
// used to be documented here.

/**
 * Model selection. Centralized so a model rotation is a one-line edit
 * (or a single env-var bump on Vercel — no redeploy needed).
 *
 * STRATEGY runs with web_search + heavy synthesis → Sonnet by default.
 * COPY is short, structurally-trivial JSON gen called ~7×/session → Haiku
 * by default for ~5-10× cost reduction at indistinguishable quality on
 * this prompt shape.
 *
 * If a model name disappears (Anthropic deprecation window), override
 * via env: KERFBOX_STRATEGY_MODEL / KERFBOX_COPY_MODEL.
 */
export const STRATEGY_MODEL =
  process.env.KERFBOX_STRATEGY_MODEL || "claude-sonnet-4-20250514";
export const COPY_MODEL =
  process.env.KERFBOX_COPY_MODEL || "claude-haiku-4-5";
