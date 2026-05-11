import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { authenticate, hasScope, logApiCall, dbError } from "@/lib/api-auth";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

// RFC-4122 UUID matcher (any version). Failing the shape check returns
// a fast 400 instead of:
//   - shipping the malformed id to Postgres (which would 22P02 it for us
//     anyway, but at the cost of a round trip + a `dbError` 500), or
//   - eating a real DB lookup for an obviously-bogus id from a scraper
//     hammering /api/briefs/[anything]. The shape check is ~free.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Read budget for individual brief lookups. A real user clicking through
// their archive might fetch a handful per session; agents listing then
// fanning out for detail want headroom too. 240/hour = 4 RPS sustained.
const READ_LIMIT_PER_HOUR = 240;
const HOUR_MS = 60 * 60 * 1000;

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

  if (!UUID_RE.test(id)) {
    void logApiCall({ subject, endpoint: "/api/briefs/:id", status: 400, durationMs: Date.now() - startedAt, byok: false });
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const rl = await checkRateLimit(
    rateLimitKey({
      prefix: "briefs:get",
      userId: subject.userId,
      apiKeyId: subject.apiKeyId ?? null,
      req,
    }),
    READ_LIMIT_PER_HOUR,
    HOUR_MS
  );
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Retry in ${rl.retryAfterSeconds}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
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
