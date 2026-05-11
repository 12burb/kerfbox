import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { currentUserIdOrNull } from "@/lib/auth";
import { authenticate, csrfGuard, dbError } from "@/lib/api-auth";

export const runtime = "nodejs";

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
