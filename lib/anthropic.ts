import Anthropic from "@anthropic-ai/sdk";

/**
 * Build an Anthropic client. If a `byok` key is passed (typically pulled from
 * the `X-Anthropic-Key` request header), it overrides our env key — the user
 * pays Anthropic directly. Otherwise we fall back to our own key.
 *
 * Throws if no key is available.
 */
export function getAnthropic(byok?: string | null): Anthropic {
  const apiKey = byok || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("No Anthropic key available (no BYOK header, no server env).");
  }
  return new Anthropic({ apiKey });
}

/** True if the server has its own fallback Anthropic key. */
export function hasAnthropicKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * Pull a BYOK Anthropic key from request headers. Only `X-Anthropic-Key`
 * is accepted — we deliberately do not accept `X-Api-Key` because it's
 * commonly used elsewhere (including for kerf.box's own auth in some
 * tooling) and a copy-paste mix-up would leak the wrong key to Anthropic.
 */
export function extractByokKey(req: Request): string | null {
  const k = req.headers.get("x-anthropic-key");
  if (!k) return null;
  const trimmed = k.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export const STRATEGY_MODEL = "claude-sonnet-4-20250514";
export const COPY_MODEL = "claude-sonnet-4-20250514";
