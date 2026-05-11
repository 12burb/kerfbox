import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase";
import { currentUserIdOrNull } from "@/lib/auth";
import { KerfSchema, BriefSchema, type Kerf } from "@/lib/schema";
import { briefToKerf } from "@/lib/legacy";
import KerfView from "@/components/cmo/BriefView";
import AuthButtons from "@/components/cmo/AuthButtons";
import { ACCENT, ACCENT_DIM, MUTED } from "@/components/cmo/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function KerfDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = getSupabaseServer();
  if (!supabase) {
    return (
      <FallbackShell
        title="Persistence not configured"
        body="Add SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY to enable saved kerfs."
      />
    );
  }

  const userId = await currentUserIdOrNull();
  if (!userId) {
    return (
      <FallbackShell
        title="Sign in required"
        body="This kerf is saved to a Clerk account. Configure Clerk keys to access it."
      />
    );
  }

  const { data, error } = await supabase
    .from("briefs")
    .select("id, url, audience, brief_json, created_at")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error || !data) notFound();

  // v0.2 stores Kerf-shaped JSON; v0.1 rows still hold legacy Brief shape.
  // Try Kerf first; if the parse fails, fall back to Brief and adapt.
  let kerf: Kerf | null = null;
  let isLegacy = false;
  const kerfParsed = KerfSchema.safeParse(data.brief_json);
  if (kerfParsed.success) {
    kerf = kerfParsed.data;
  } else {
    const legacyParsed = BriefSchema.safeParse(data.brief_json);
    if (legacyParsed.success) {
      kerf = briefToKerf(legacyParsed.data);
      isLegacy = true;
    }
  }

  if (!kerf) {
    return (
      <FallbackShell
        title="Saved record is malformed"
        body="The stored payload no longer matches any known schema."
      />
    );
  }

  return (
    <div className="min-h-screen w-full">
      <div className="relative max-w-6xl mx-auto px-6 md:px-10 py-8 md:py-12">
        <header className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 flex items-center justify-center"
              style={{ background: ACCENT }}
            >
              <span className="mono text-black font-bold text-sm">K</span>
            </div>
            <div>
              <div className="serif text-xl leading-none" style={{ fontWeight: 600 }}>
                kerf<span style={{ color: ACCENT }}>.</span>box
              </div>
              <div
                className="mono text-[10px] uppercase tracking-widest"
                style={{ color: MUTED }}
              >
                {new Date(data.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}{" "}
                · {data.url}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/briefs"
              className="mono text-[11px] uppercase tracking-widest px-3 py-2 border"
              style={{ borderColor: ACCENT_DIM, color: MUTED }}
            >
              ← archive
            </Link>
            <AuthButtons />
          </div>
        </header>
        {isLegacy && (
          <div
            className="mb-8 p-4 mono text-[11px] uppercase tracking-widest"
            style={{
              border: `1px dashed ${ACCENT_DIM}`,
              color: MUTED,
              background: "transparent",
            }}
          >
            <span style={{ color: ACCENT }}>⎯ Legacy v0.1 brief.</span> This
            record predates the Kerf method. Re-run on{" "}
            <Link href="/app" className="underline" style={{ color: ACCENT }}>
              /app
            </Link>{" "}
            to cut a defensible Kerf.
          </div>
        )}
        <KerfView kerf={kerf} />
      </div>
    </div>
  );
}

function FallbackShell({ title, body }: { title: string; body: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-10">
      <div className="text-center space-y-3 max-w-md">
        <div
          className="mono text-[10px] uppercase tracking-widest"
          style={{ color: ACCENT }}
        >
          ⎯ {title}
        </div>
        <div className="serif text-xl" style={{ fontWeight: 500 }}>
          {body}
        </div>
        <Link
          href="/app"
          className="inline-block mono text-[11px] uppercase tracking-widest px-3 py-2 border mt-4"
          style={{ borderColor: ACCENT_DIM, color: MUTED }}
        >
          ← back to app
        </Link>
      </div>
    </main>
  );
}
