import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Request hardening helpers for the public API.
 *
 * kerf.box is account-free: there are no sessions, no minted API keys, and
 * no server-side identity to resolve. Every request authorizes on the
 * caller's OWN provider key (BYOK) via the `X-Provider` + `X-Api-Key`
 * headers (or the legacy `X-Anthropic-Key`), or runs in demo mode. The
 * route handlers do that check inline via lib/providers.ts; this module
 * only carries the cross-cutting guards that survive that model:
 *
 *   • enforceBodyLimit      — cheap declared-length rejection.
 *   • readJsonBodyWithLimit — read + parse the body with a real byte cap.
 *   • sanitizeForLog        — scrub secrets out of anything bound for logs.
 *
 * There is intentionally no authenticate(), no database, and no usage
 * logging here anymore — rate limiting keys on IP (see lib/rate-limit.ts).
 */

/**
 * Reject oversized request bodies before we parse them.
 *
 * Next's App Router does NOT impose the old Pages-API 1 MB body cap, so
 * `await req.json()` will happily buffer and parse an arbitrarily large
 * payload into memory — and Zod's `.max()` caps only kick in *after* the
 * whole thing is parsed. An anonymous caller inside the IP bucket could
 * POST hundreds of MB and force a full parse + schema walk on the expensive
 * inference routes. We cap on the declared Content-Length first (cheap,
 * before reading the stream).
 *
 * `maxBytes` defaults to 512 KB — a fully-populated Kerf JSON is ~10-30 KB,
 * so this is generous headroom while still stopping MB-scale abuse.
 *
 * Content-Length is optional (chunked transfer) and unverified, so this
 * header check alone is bypassable by omitting the header — it exists to
 * fail fast on honest oversized requests. The real cap is enforced by
 * `readJsonBodyWithLimit`, which counts actual bytes off the stream.
 *
 * Returns a 413 NextResponse when over the cap, null otherwise.
 */
export function enforceBodyLimit(
  req: Request | NextRequest,
  maxBytes = 512_000
): NextResponse | null {
  const len = req.headers.get("content-length");
  if (len) {
    const n = Number(len);
    if (Number.isFinite(n) && n > maxBytes) {
      return bodyTooLarge(maxBytes);
    }
  }
  return null;
}

function bodyTooLarge(maxBytes: number): NextResponse {
  return NextResponse.json(
    { error: `Request body too large (max ${maxBytes} bytes).` },
    { status: 413 }
  );
}

/**
 * Read and JSON-parse a request body while counting the bytes actually
 * received, aborting at `maxBytes`. This closes the chunked-transfer hole
 * left by the Content-Length check above: a caller that omits the header
 * still cannot make us buffer more than the cap.
 *
 * Unparseable or empty bodies resolve to `body: null` (never throws) so
 * call sites keep their existing "schema parse fails → 400" behavior.
 */
export async function readJsonBodyWithLimit(
  req: Request | NextRequest,
  maxBytes = 512_000
): Promise<{ ok: true; body: unknown } | { ok: false; response: NextResponse }> {
  if (!req.body) return { ok: true, body: null };
  const reader = req.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let received = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maxBytes) {
        await reader.cancel().catch(() => {});
        return { ok: false, response: bodyTooLarge(maxBytes) };
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } catch {
    // Client hung up mid-body or the stream errored — treat as no body.
    return { ok: true, body: null };
  }
  try {
    return { ok: true, body: JSON.parse(text) };
  } catch {
    return { ok: true, body: null };
  }
}

/**
 * Scrub secrets out of a value bound for `console.error`. Anthropic SDK
 * errors and fetch errors can carry the original key in retry context
 * or response.config — we don't want that text to land in Vercel logs
 * (which are user-readable in some plan tiers and queryable across the
 * org). Covers `sk-ant-…` BYOK keys, the legacy `cmo_live_…` key prefix,
 * and raw auth headers.
 *
 * Imported by lib/rate-limit.ts as well — keep this export stable.
 */
export function sanitizeForLog(value: unknown): unknown {
  let str: string;
  if (value instanceof Error) {
    str = value.stack ?? value.message;
  } else if (typeof value === "string") {
    str = value;
  } else {
    try {
      // JSON.stringify returns undefined (not a string) for undefined,
      // functions, and symbols — String() covers those so `throw undefined`
      // somewhere upstream can't crash the logger itself.
      str = JSON.stringify(value) ?? String(value);
    } catch {
      str = String(value);
    }
  }
  return str
    .replace(/sk-ant-[A-Za-z0-9_-]+/g, "sk-ant-[REDACTED]")
    // Multi-provider BYOK (v0.3): the generic `sk-` prefix covers OpenAI,
    // OpenRouter (sk-or-v1-…), Kimi/Moonshot, Qwen/DashScope, and DeepSeek
    // keys; gsk_ is Groq; AIza is a Google API key. The 8+ floor keeps
    // ordinary prose like "sk-launch" from being eaten.
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, "sk-[REDACTED]")
    .replace(/gsk_[A-Za-z0-9_-]{8,}/g, "gsk_[REDACTED]")
    .replace(/AIza[A-Za-z0-9_-]{10,}/g, "AIza[REDACTED]")
    .replace(/cmo_(live|test)_[A-Za-z0-9]+/g, "cmo_$1_[REDACTED]")
    // Optionally swallow a `Bearer`/`Basic` scheme word so the token after
    // it is redacted too — without this, "Authorization: Bearer abc" would
    // redact only the word "Bearer" and leave the token in the log.
    .replace(
      /(x-anthropic-key|x-api-key|authorization)["'\s:=]+(?:(?:bearer|basic)\s+)?[^"'\s,}]+/gi,
      "$1=[REDACTED]"
    );
}
