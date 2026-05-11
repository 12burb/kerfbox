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
 * Returns null when neither is set (callers must surface this as a 503
 * rather than silently falling through to demo content for API-key
 * traffic — see route handlers).
 */
function serverAnthropicKey(): string | null {
  return process.env.KERFBOX_ANTHROPIC_KEY ?? process.env.ANTHROPIC_API_KEY ?? null;
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

/**
 * Pull a BYOK Anthropic key from request headers. Only `X-Anthropic-Key`
 * is accepted — we deliberately do not accept `X-Api-Key` because it's
 * commonly used elsewhere (including for kerf.box's own auth in some
 * tooling) and a copy-paste mix-up would leak the wrong key to Anthropic.
 *
 * Shape check (`sk-ant-…`) is enforced so a typo'd key surfaces upstream
 * as a clean 401 instead of going to Anthropic and coming back with an
 * opaque SDK error that we'd then collapse to "Inference failed". This
 * also blocks an accidental paste of a kerf.box `cmo_live_…` key (wrong
 * service) into the wrong header.
 */
const BYOK_SHAPE = /^sk-ant-[A-Za-z0-9_-]{20,}$/;
export function extractByokKey(req: Request): string | null {
  const k = req.headers.get("x-anthropic-key");
  if (!k) return null;
  const trimmed = k.trim();
  if (!BYOK_SHAPE.test(trimmed)) return null;
  return trimmed;
}

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
  process.env.KERFBOX_STRATEGY_MODEL ?? "claude-sonnet-4-20250514";
export const COPY_MODEL =
  process.env.KERFBOX_COPY_MODEL ?? "claude-haiku-4-5";
