import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabase";
import { currentUserIdOrNull } from "@/lib/auth";
import { generateApiKey, KNOWN_SCOPES, DEFAULT_SCOPES } from "@/lib/api-keys";
import { authenticate, csrfGuard, dbError } from "@/lib/api-auth";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Key-management endpoints are session-only (no Bearer auth — you can't
// bootstrap a key with a key). Rate limits are tight on POST because key
// minting is the only credentialed-write surface a phished session could
// abuse — even with the 20-active cap, an attacker could mint+revoke in
// a loop. 30 mints/hour is comfortable for a human revising labels;
// listing is 240/hour for the /app/keys UI's polling and refreshes.
const LIST_LIMIT_PER_HOUR = 240;
const MINT_LIMIT_PER_HOUR = 30;
const HOUR_MS = 60 * 60 * 1000;

const ScopeEnum = z.enum(KNOWN_SCOPES);

const CreateKeyRequest = z.object({
  name: z.string().min(1).max(64),
  /**
   * Optional. If omitted, defaults to DEFAULT_SCOPES (least-privilege —
   * no briefs:write). Any scope not in KNOWN_SCOPES is rejected at parse
   * time so a caller can't mint a key with arbitrary strings that a
   * future endpoint might accidentally trust.
   */
  scopes: z.array(ScopeEnum).min(1).optional(),
});

/**
 * GET /api/keys — list the current user's API keys (metadata only — never
 * returns the plaintext key or key_hash).
 *
 * Auth: Clerk session ONLY (this endpoint manages keys; you can't bootstrap
 * a key with a key).
 */
export async function GET(req: Request) {
  const userId = await currentUserIdOrNull();
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 503 });
  }

  const rl = checkRateLimit(
    rateLimitKey({ prefix: "keys:list", userId, apiKeyId: null, req }),
    LIST_LIMIT_PER_HOUR,
    HOUR_MS
  );
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Retry in ${rl.retryAfterSeconds}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    );
  }

  const { data, error } = await supabase
    .from("api_keys")
    .select("id, name, key_prefix, scopes, last_used_at, created_at, revoked_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return dbError("api_keys:list", error);
  return NextResponse.json({ keys: data ?? [] });
}

/** Cap on simultaneously-active keys per user. Generous enough for a
 *  power user with multiple agents (Claude Desktop, Cursor, CI, custom
 *  Agent SDK builds), tight enough that a compromised account can't
 *  silently mint a fleet to keep around after a password reset. */
const MAX_ACTIVE_KEYS_PER_USER = 20;

/**
 * POST /api/keys — mint a new API key. Plaintext key is returned ONCE in
 * the response and never stored unhashed.
 *
 * Body: { name: string, scopes?: KnownScope[] }
 * Returns: { id, key, prefix, name, scopes, created_at }
 */
export async function POST(req: Request) {
  const userId = await currentUserIdOrNull();
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  // CSRF guard. /api/keys is session-only (you can't bootstrap a key
  // with a key), so the Origin check applies to every request that
  // gets past auth.
  const subject = await authenticate(req);
  const csrf = csrfGuard(req, subject);
  if (csrf) return csrf;

  // Tight mint budget. Even with the 20-active-keys cap, a phished
  // session could spin mint+revoke loops to confuse audit logs —
  // 30/hr puts a hard ceiling on the noise.
  const rl = checkRateLimit(
    rateLimitKey({ prefix: "keys:mint", userId, apiKeyId: null, req }),
    MINT_LIMIT_PER_HOUR,
    HOUR_MS
  );
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Retry in ${rl.retryAfterSeconds}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    );
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateKeyRequest.safeParse(body);
  if (!parsed.success) {
    // Don't return Zod's flatten() — it leaks the internal schema shape
    // to any caller including unauthenticated probes (the auth check is
    // above, but in v0.3 we may relax that for testing). The known_scopes
    // hint is intentional — it's documentation, not internals.
    return NextResponse.json(
      { error: "Invalid payload. Name 1-64 chars; scopes from known_scopes.", known_scopes: KNOWN_SCOPES },
      { status: 400 }
    );
  }

  // Enforce active-key cap. Count rather than rely on a partial unique
  // index because we want a clean 409 the user can act on, not a DB
  // constraint error.
  const { count: activeCount, error: countErr } = await supabase
    .from("api_keys")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("revoked_at", null);
  if (countErr) return dbError("api_keys:count", countErr);
  if ((activeCount ?? 0) >= MAX_ACTIVE_KEYS_PER_USER) {
    return NextResponse.json(
      {
        error: `You already have ${activeCount} active keys (max ${MAX_ACTIVE_KEYS_PER_USER}). Revoke an unused key, then try again.`,
      },
      { status: 409 }
    );
  }

  const { name, scopes } = parsed.data;
  const { key, hash, prefix } = generateApiKey();
  const insertScopes = scopes && scopes.length > 0 ? scopes : DEFAULT_SCOPES;

  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      user_id: userId,
      key_hash: hash,
      key_prefix: prefix,
      name,
      scopes: insertScopes,
    })
    .select("id, name, key_prefix, scopes, created_at")
    .single();

  if (error) return dbError("api_keys:insert", error);

  // Cache-Control: no-store + Pragma: no-cache so the *only* response in
  // the system carrying secret material can never be cached by a service
  // worker, browser extension, or upstream proxy.
  return NextResponse.json(
    {
      id: data.id,
      name: data.name,
      key_prefix: data.key_prefix,
      scopes: data.scopes,
      created_at: data.created_at,
      /** Plaintext — shown ONCE. Caller must store it now. */
      key,
    },
    {
      headers: {
        "Cache-Control": "no-store, private, max-age=0, must-revalidate",
        Pragma: "no-cache",
      },
    }
  );
}
