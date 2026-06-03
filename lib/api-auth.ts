import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Request hardening helpers for the public API.
 *
 * kerf.box is account-free: there are no sessions, no minted API keys, and
 * no server-side identity to resolve. Every request authorizes on the
 * caller's OWN Anthropic key (BYOK) via the `X-Anthropic-Key` header, or
 * runs in demo mode. The route handlers do that check inline; this module
 * only carries the cross-cutting guards that survive that model:
 *
 *   • enforceBodyLimit — reject oversized payloads before parsing.
 *   • sanitizeForLog    — scrub secrets out of anything bound for logs.
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
      return NextResponse.json(
        { error: `Request body too large (max ${maxBytes} bytes).` },
        { status: 413 }
      );
    }
  }
  return null;
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
      str = JSON.stringify(value);
    } catch {
      str = String(value);
    }
  }
  return str
    .replace(/sk-ant-[A-Za-z0-9_-]+/g, "sk-ant-[REDACTED]")
    .replace(/cmo_(live|test)_[A-Za-z0-9]+/g, "cmo_$1_[REDACTED]")
    .replace(/(x-anthropic-key|x-api-key|authorization)["'\s:=]+[^"'\s,}]+/gi, "$1=[REDACTED]");
}
