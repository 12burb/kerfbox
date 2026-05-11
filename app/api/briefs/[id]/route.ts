import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { authenticate, hasScope, logApiCall, dbError } from "@/lib/api-auth";

export const runtime = "nodejs";

/**
 * GET /api/briefs/:id — fetch one saved brief by id (caller-scoped).
 *
 * Auth: Clerk session OR API key (scope: briefs:read).
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const startedAt = Date.now();
  const { id } = await params;
  const subject = await authenticate(req);
  const supabase = getSupabaseServer();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 503 });
  }
  if (!subject) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (subject.via === "api_key" && !hasScope(subject, "briefs:read")) {
    return NextResponse.json(
      { error: "API key missing required scope: briefs:read" },
      { status: 403 }
    );
  }

  const { data, error } = await supabase
    .from("briefs")
    .select("id, url, audience, brief_json, created_at")
    .eq("id", id)
    .eq("user_id", subject.userId)
    .maybeSingle();

  // Distinguish a real DB error from a clean "not found" so monitoring
  // sees infra problems instead of a sea of 404s.
  if (error) {
    void logApiCall({ subject, endpoint: "/api/briefs/:id", status: 500, durationMs: Date.now() - startedAt, byok: false });
    return dbError("briefs:get", error);
  }
  if (!data) {
    void logApiCall({ subject, endpoint: "/api/briefs/:id", status: 404, durationMs: Date.now() - startedAt, byok: false });
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  void logApiCall({ subject, endpoint: "/api/briefs/:id", status: 200, durationMs: Date.now() - startedAt, byok: false });
  // `kerf` is the v0.2 field; `brief` is retained as a deprecated alias
  // so v0.1 SDK clients keep working through the deprecation window.
  return NextResponse.json({ kerf: data, brief: data });
}
