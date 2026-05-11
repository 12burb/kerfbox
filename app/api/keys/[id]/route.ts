import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { currentUserIdOrNull } from "@/lib/auth";
import { authenticate, csrfGuard, dbError } from "@/lib/api-auth";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Same UUID shape check as /api/briefs/[id] — fail fast on garbage ids
// instead of round-tripping to Postgres for a 22P02.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Match the mint budget — revoke is paired with mint and shouldn't be
// the looser of the two. 30/hour comfortably covers a power user
// rotating keys.
const REVOKE_LIMIT_PER_HOUR = 30;
const HOUR_MS = 60 * 60 * 1000;

/**
 * DELETE /api/keys/:id — revoke an API key. Soft-delete (sets revoked_at)
 * so we keep the audit trail in api_calls.
 *
 * The WHERE clause requires `revoked_at IS NULL` so a double-revoke
 * doesn't clobber the original timestamp. We also `.select()` + check the
 * row count so we can return 404 when the id doesn't exist, isn't owned
 * by the caller, or was already revoked — without leaking which of the
 * three it is.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await currentUserIdOrNull();
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  // CSRF — DELETE is a state change. Same rationale as /api/keys POST.
  const subject = await authenticate(req);
  const csrf = csrfGuard(req, subject);
  if (csrf) return csrf;

  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const rl = await checkRateLimit(
    rateLimitKey({ prefix: "keys:revoke", userId, apiKeyId: null, req }),
    REVOKE_LIMIT_PER_HOUR,
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

  const { data, error } = await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .is("revoked_at", null)
    .select("id");

  if (error) return dbError("api_keys:revoke", error);
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({ revoked: true });
}
