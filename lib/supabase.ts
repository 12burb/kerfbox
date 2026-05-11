import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase client accessors — memoized per module instance.
 *
 * Why memoize: `createClient` builds a fresh fetch wrapper, AbortController
 * plumbing, GoTrue/PostgREST/Realtime adapters, and a Promise of GoTrue
 * subscriptions on every call. On a hot serverless instance handling 50
 * RPS, the previous "new client per call" pattern allocated 50 clients/
 * second for no reason — the credentials don't change between requests,
 * and the underlying transport is the same global fetch. Memoizing makes
 * the second-and-onward request on a warm container effectively free for
 * Supabase init.
 *
 * Why not eagerly construct at module load: we want `null` semantics when
 * env vars are missing (local dev, preview without Supabase wired up). A
 * module-load throw would crash routes that don't actually need Supabase.
 *
 * Safety: `auth.persistSession: false` + `autoRefreshToken: false` for the
 * server client means there's no per-instance auth state to share. The
 * browser variant uses the anon key (RLS guards the data — see schema.sql).
 *
 * Cache invalidation: there isn't any. If you rotate the service-role key,
 * a redeploy is required — which is what you'd want anyway since the env
 * vars come from Vercel and a rotation should land in a release.
 */

let serverClient: SupabaseClient | null | undefined;
let browserClient: SupabaseClient | null | undefined;

export function getSupabaseBrowser(): SupabaseClient | null {
  if (browserClient !== undefined) return browserClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  browserClient = url && key ? createClient(url, key) : null;
  return browserClient;
}

export function getSupabaseServer(): SupabaseClient | null {
  if (serverClient !== undefined) return serverClient;
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  serverClient =
    url && key
      ? createClient(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : null;
  return serverClient;
}
