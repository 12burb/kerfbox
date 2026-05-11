import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { currentUserIdOrNull } from "./auth";
import { extractBearer, hashApiKey, looksLikeApiKey } from "./api-keys";
import { getSupabaseServer } from "./supabase";

export type AuthSubject = {
  userId: string;
  /** "session" = Clerk web session. "api_key" = Bearer token. */
  via: "session" | "api_key";
  apiKeyId?: string;
  scopes?: string[];
};

/**
 * Resolve the calling identity for a request.
 *
 * Auth precedence:
 *   1. If an `Authorization` header is present, we MUST resolve it as a
 *      Bearer API key. We never silently fall through to a session cookie
 *      when a Bearer was attempted — that would let a request with a
 *      malformed/expired key authenticate as the cookie's owner if the
 *      same browser is also logged in.
 *   2. If no Authorization header is present, fall back to a Clerk session.
 *
 * Returns null when unauthenticated.
 */
export async function authenticate(req: Request | NextRequest): Promise<AuthSubject | null> {
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    const bearer = extractBearer(authHeader);
    if (!bearer || !looksLikeApiKey(bearer)) return null;
    return resolveApiKey(bearer);
  }

  const userId = await currentUserIdOrNull();
  if (userId) return { userId, via: "session" };

  return null;
}

/** Throttle window for last_used_at writes — one update per key per minute. */
const LAST_USED_THROTTLE_MS = 60_000;

async function resolveApiKey(key: string): Promise<AuthSubject | null> {
  const supabase = getSupabaseServer();
  if (!supabase) return null;

  const hash = hashApiKey(key);
  const { data, error } = await supabase
    .from("api_keys")
    .select("id, user_id, scopes, revoked_at, last_used_at")
    .eq("key_hash", hash)
    .is("revoked_at", null)
    .maybeSingle();

  if (error || !data) return null;

  // Fire-and-forget last_used_at touch — but only when the existing
  // timestamp is null or older than LAST_USED_THROTTLE_MS. Without this,
  // a busy agent issues one UPDATE per request on the same row (lock
  // contention, WAL bloat, autovacuum churn).
  //
  // The WHERE adds `revoked_at IS NULL` so a race between this call and
  // a revoke can't resurrect last_used_at on a key that was just killed.
  const lastUsedAge = data.last_used_at
    ? Date.now() - new Date(data.last_used_at).getTime()
    : Infinity;
  if (lastUsedAge > LAST_USED_THROTTLE_MS) {
    void supabase
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", data.id)
      .is("revoked_at", null)
      .then(({ error: touchErr }) => {
        if (touchErr) console.error("[api_keys:touch] failed", touchErr);
      });
  }

  return {
    userId: data.user_id,
    via: "api_key",
    apiKeyId: data.id,
    scopes: data.scopes ?? undefined,
  };
}

/**
 * Best-effort write to the api_calls usage log. Never throws.
 *
 * supabase-js does not throw on Postgres errors — it resolves with
 * `{ error }`. We log those instead of swallowing so a broken telemetry
 * write surfaces in server logs without breaking the user-facing request.
 */
export async function logApiCall(args: {
  subject: AuthSubject | null;
  endpoint: string;
  status: number;
  durationMs: number;
  byok: boolean;
}) {
  if (!args.subject) return;
  const supabase = getSupabaseServer();
  if (!supabase) return;
  try {
    const { error } = await supabase.from("api_calls").insert({
      api_key_id: args.subject.apiKeyId ?? null,
      user_id: args.subject.userId,
      endpoint: args.endpoint,
      status: args.status,
      duration_ms: args.durationMs,
      byok: args.byok,
    });
    if (error) console.error("[api_calls:insert] failed", error);
  } catch (err) {
    // Network-level rejection. Never break a request because telemetry choked.
    console.error("[api_calls:insert] threw", err);
  }
}

export function hasScope(subject: AuthSubject, scope: string): boolean {
  // Web sessions have all scopes implicitly.
  if (subject.via === "session") return true;
  return !!subject.scopes?.includes(scope);
}

/**
 * Whether the caller attempted any kind of Authorization-header auth
 * (regardless of whether it resolved or even used the right scheme). Used
 * by routes that want to differentiate "no auth attempted" (anonymous demo
 * path is fine) from "auth attempted and failed" (must be 401 — never
 * silently downgrade a bad key to anonymous).
 *
 * We intentionally accept any non-empty Authorization header, not just
 * `Bearer …`, so a caller who forgets the scheme and sends
 * `Authorization: cmo_live_…` doesn't silently get demo content with
 * HTTP 200 — they get a clean 401 instead.
 */
export function attemptedAuth(req: Request | NextRequest): boolean {
  const h = req.headers.get("authorization");
  return !!h && h.trim().length > 0;
}

/**
 * Wrap a Postgres/Supabase error so the raw message (which can include
 * constraint names, column names, schema hints) never leaks to API
 * callers. Logs the full error server-side, returns a generic 500.
 */
export function dbError(context: string, err: unknown, status = 500): NextResponse {
  console.error(`[db:${context}] failed`, sanitizeForLog(err));
  return NextResponse.json({ error: "Internal error." }, { status });
}

/**
 * Same-origin guard for state-changing endpoints authenticated via a
 * browser session cookie. The threat model is classic CSRF: a malicious
 * site posts to `/api/briefs` from the user's logged-in browser. Clerk's
 * cookie is SameSite=Lax by default, which prevents cross-site POST,
 * but defense in depth is cheap — we also require the Origin header to
 * match the request's host.
 *
 * Skip for API-key callers (no cookie, no CSRF surface). The check
 * mostly punishes a bug in browser cookie defaults rather than a real
 * attack vector — but it's a 5-line cost for one more layer.
 *
 * Returns null on pass, a 403 NextResponse on fail.
 */
export function csrfGuard(req: Request, subject: AuthSubject | null): NextResponse | null {
  if (!subject || subject.via !== "session") return null;
  const origin = req.headers.get("origin");
  // Same-origin SPA fetches always send an Origin. If absent, treat as
  // suspicious — this is a state-changing endpoint, not a navigational
  // GET.
  if (!origin) {
    return NextResponse.json({ error: "Origin header required." }, { status: 403 });
  }
  // Compare *hostnames* — not hosts. Browsers send the Origin header
  // without a port for default ports (80/443), but Host / x-forwarded-host
  // may or may not include the port depending on the proxy chain. A naive
  // `host === host` comparison would 403 a perfectly legitimate same-origin
  // request the moment any layer normalizes differently (e.g. dev server
  // on :3000 served via a tunnel that strips the port). Stripping to
  // hostname matches what browsers themselves treat as "same origin"
  // for CSRF purposes.
  let originHost: string;
  try {
    originHost = new URL(origin).hostname;
  } catch {
    return NextResponse.json({ error: "Invalid Origin header." }, { status: 403 });
  }
  const rawExpected = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (!rawExpected) {
    return NextResponse.json({ error: "Cross-origin request rejected." }, { status: 403 });
  }
  // Strip the port from the expected host. `new URL()` won't accept a
  // bare "example.com:3000", so do it by hand.
  const expectedHost = rawExpected.split(":")[0].toLowerCase();
  if (originHost.toLowerCase() !== expectedHost) {
    return NextResponse.json({ error: "Cross-origin request rejected." }, { status: 403 });
  }
  return null;
}

/**
 * Scrub secrets out of a value bound for `console.error`. Anthropic SDK
 * errors and fetch errors can carry the original key in retry context
 * or response.config — we don't want that text to land in Vercel logs
 * (which are user-readable in some plan tiers and queryable across the
 * org). Same applies to the caller-supplied `cmo_live_…` key prefix and
 * any `sk-ant-…` BYOK key text.
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
