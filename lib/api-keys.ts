import { createHash, randomBytes } from "crypto";

/**
 * kerf.box API key format: `cmo_live_<base62-32>` for live keys,
 * (Prefix kept for back-compat with v0.1 keys already issued to users.)
 * `cmo_test_<base62-32>` for test/sandbox keys (reserved for future use).
 *
 * The plaintext key is shown to the user exactly once at creation.
 * We store sha256(key) — same trick GitHub, Stripe, OpenAI all use.
 */

const KEY_PREFIX = "cmo_live_";
const PREFIX_DISPLAY_LEN = KEY_PREFIX.length + 4; // "cmo_live_abcd"
const BODY_BYTES = 24; // 24 bytes → 32 char base64url; ~192 bits of entropy

// Canonical scope list lives in `lib/scopes.ts` (no node imports) so
// client components can use it. Re-export here so existing server-side
// imports keep working.
export { KNOWN_SCOPES, DEFAULT_SCOPES } from "./scopes";
export type { KnownScope } from "./scopes";

const BASE62 =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

function bytesToBase62(buf: Buffer): string {
  // Treat the buffer as a big integer and emit base62. Stable, URL-safe, no padding.
  let n = BigInt("0x" + buf.toString("hex"));
  if (n === 0n) return "0";
  const out: string[] = [];
  while (n > 0n) {
    const r = Number(n % 62n);
    out.push(BASE62[r]);
    n = n / 62n;
  }
  return out.reverse().join("");
}

export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const body = bytesToBase62(randomBytes(BODY_BYTES)).padStart(32, "0").slice(-32);
  const key = `${KEY_PREFIX}${body}`;
  return {
    key,
    hash: hashApiKey(key),
    prefix: key.slice(0, PREFIX_DISPLAY_LEN),
  };
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * We always mint a 32-char base62 body, so accept exactly that. Tighter
 * than `{16,}` rejects obvious truncations / typos before a DB roundtrip
 * and shrinks the surface for cheap probes.
 */
export function looksLikeApiKey(s: string | null | undefined): s is string {
  return !!s && /^cmo_(live|test)_[A-Za-z0-9]{32}$/.test(s);
}

/**
 * Pull a Bearer token out of an Authorization header.
 * Returns null if the header is missing or malformed.
 */
export function extractBearer(authHeader: string | null | undefined): string | null {
  if (!authHeader) return null;
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}
