import { NextResponse } from "next/server";
import { z } from "zod";
import { KerfSchema, BriefSchema } from "@/lib/schema";
import { getSupabaseServer } from "@/lib/supabase";
import { authenticate, csrfGuard, hasScope, logApiCall, dbError } from "@/lib/api-auth";

export const runtime = "nodejs";

// Accept either `kerf` (v0.2) or `brief` (v0.1 legacy alias). Exactly one
// must be present. The wire shape is enforced at the schema layer; the
// row in Supabase always lands in `brief_json` regardless.
const SaveRequest = z
  .object({
    url: z.string().min(1),
    audience: z.string().min(1),
    kerf: KerfSchema.optional(),
    brief: BriefSchema.optional(),
  })
  .refine((d) => !!d.kerf !== !!d.brief, {
    message: "Provide exactly one of `kerf` (v0.2) or `brief` (v0.1 legacy).",
  });

/**
 * GET /api/briefs — list the caller's saved briefs (newest first, max 50).
 *
 * Auth: Clerk session OR `Authorization: Bearer cmo_live_...`
 * Required scope (API key): briefs:read
 *
 * Returns: { briefs: [{ id, url, audience, brief_json, created_at }, ...] }
 */
export async function GET(req: Request) {
  const startedAt = Date.now();
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
    .eq("user_id", subject.userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    void logApiCall({ subject, endpoint: "/api/briefs", status: 500, durationMs: Date.now() - startedAt, byok: false });
    return dbError("briefs:list", error);
  }

  void logApiCall({ subject, endpoint: "/api/briefs", status: 200, durationMs: Date.now() - startedAt, byok: false });
  // `kerfs` is the v0.2 field; `briefs` retained as deprecated alias.
  const rows = data ?? [];
  return NextResponse.json({ kerfs: rows, briefs: rows });
}

/**
 * POST /api/briefs — save a brief to the caller's archive.
 *
 * Auth: Clerk session OR API key with scope `briefs:write`.
 * Body: { url, audience, brief }
 * Returns: { id }
 */
export async function POST(req: Request) {
  const startedAt = Date.now();

  // Auth + scope check first — *before* parsing the body — so an
  // unauthenticated caller can't trigger Zod validation on arbitrary
  // payloads (cheap DoS amplifier + leaks our schema shape via Zod
  // error structure).
  const subject = await authenticate(req);
  if (!subject) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (subject.via === "api_key" && !hasScope(subject, "briefs:write")) {
    return NextResponse.json(
      { error: "API key missing required scope: briefs:write" },
      { status: 403 }
    );
  }
  // CSRF guard for session-cookie callers — defense in depth on top of
  // SameSite=Lax. No-op for API-key callers (they don't use cookies).
  const csrf = csrfGuard(req, subject);
  if (csrf) return csrf;

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const parsed = SaveRequest.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const { url, audience, kerf, brief } = parsed.data;
  // Either kerf or brief is set (refine guarantees exactly one); store
  // whichever the caller sent into the JSONB column.
  const payload = kerf ?? brief;
  const { data, error } = await supabase
    .from("briefs")
    .insert({ user_id: subject.userId, url, audience, brief_json: payload })
    .select("id")
    .single();

  if (error) {
    void logApiCall({ subject, endpoint: "/api/briefs", status: 500, durationMs: Date.now() - startedAt, byok: false });
    return dbError("briefs:save", error);
  }

  void logApiCall({ subject, endpoint: "/api/briefs", status: 201, durationMs: Date.now() - startedAt, byok: false });
  return NextResponse.json({ id: data.id });
}
