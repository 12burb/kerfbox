import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase";
import { currentUserIdOrNull } from "@/lib/auth";
import { ACCENT, ACCENT_DIM, MUTED } from "@/components/cmo/shared";
import AuthButtons from "@/components/cmo/AuthButtons";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The brief_json column holds either v0.2 Kerf or v0.1 Brief shape.
// We just want a one-line label, so we check for both fields and fall
// back to a dash. Strict parse happens on the detail page.
type Row = {
  id: string;
  url: string;
  audience: string;
  created_at: string;
  brief_json: {
    wedge?: { claim?: string };
    positioning?: { angle?: string };
  } | null;
};

function rowLabel(row: Row): { label: string; legacy: boolean } {
  const claim = row.brief_json?.wedge?.claim;
  if (claim) return { label: claim, legacy: false };
  const angle = row.brief_json?.positioning?.angle;
  if (angle) return { label: angle, legacy: true };
  return { label: "—", legacy: false };
}

export default async function ArchivePage() {
  const supabase = getSupabaseServer();
  const userId = await currentUserIdOrNull();

  let rows: Row[] = [];
  let emptyMessage: string | null = null;
  if (!supabase) {
    emptyMessage = "Persistence not configured. Add Supabase env vars to see saved kerfs.";
  } else if (!userId) {
    emptyMessage = "Sign in required. Configure Clerk to view your saved kerfs.";
  } else {
    const { data } = await supabase
      .from("briefs")
      .select("id, url, audience, brief_json, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    rows = (data as Row[] | null) ?? [];
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
                Archive
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/app"
              className="mono text-[11px] uppercase tracking-widest px-3 py-2 border"
              style={{ borderColor: ACCENT_DIM, color: MUTED }}
            >
              ← new kerf
            </Link>
            <AuthButtons />
          </div>
        </header>

        {emptyMessage ? (
          <div
            className="mono text-xs uppercase tracking-widest py-16 text-center"
            style={{ color: MUTED }}
          >
            {emptyMessage}
          </div>
        ) : rows.length === 0 ? (
          <div
            className="mono text-xs uppercase tracking-widest py-16 text-center"
            style={{ color: MUTED }}
          >
            No kerfs yet. Cut one from /app.
          </div>
        ) : (
          <ul className="divide-y" style={{ borderColor: ACCENT_DIM }}>
            {rows.map((row) => {
              const { label, legacy } = rowLabel(row);
              const when = new Date(row.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
              return (
                <li key={row.id} className="py-5">
                  <Link href={`/brief/${row.id}`} className="block group">
                    <div className="flex items-baseline justify-between gap-6 mb-1">
                      <div
                        className="mono text-[10px] uppercase tracking-widest flex items-center gap-2"
                        style={{ color: ACCENT }}
                      >
                        <span>{when}</span>
                        {legacy && (
                          <span
                            className="px-1.5 py-0.5"
                            style={{
                              border: `1px dashed ${ACCENT_DIM}`,
                              color: MUTED,
                            }}
                          >
                            v0.1
                          </span>
                        )}
                      </div>
                      <div
                        className="mono text-[10px] uppercase tracking-widest truncate"
                        style={{ color: MUTED }}
                      >
                        {row.url}
                      </div>
                    </div>
                    <div
                      className="serif text-lg md:text-xl group-hover:underline"
                      style={{ fontWeight: 500 }}
                    >
                      {label}
                    </div>
                    <div className="text-sm mt-1" style={{ color: MUTED }}>
                      {row.audience}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
