-- kerf.box schema (v0.2)
--
-- Apply once against a fresh Supabase Postgres database. Idempotent — safe
-- to re-run on an existing schema. The `briefs` table name is kept (not
-- renamed to `kerfs`) so v0.1 rows survive the v0.2 cut. The brief_json
-- column holds either a Kerf (v0.2) or a Brief (v0.1); see lib/legacy.ts
-- for the runtime upgrade path on read.
--
-- Tables:
--   briefs       — saved Kerfs (and legacy v0.1 Briefs) per user
--   copy_outputs — generated platform copy, child of a brief row
--   api_keys     — sha256-hashed API keys with scopes for agent/MCP callers
--   api_calls    — usage log for billing + abuse detection (1 row / request)

create extension if not exists pgcrypto;

------------------------------------------------------------------------
-- briefs / copy_outputs — strategy artifacts
------------------------------------------------------------------------

create table if not exists briefs (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null,                -- Clerk user id
  url         text not null,
  audience    text not null,
  brief_json  jsonb not null,               -- Kerf (v0.2) or Brief (v0.1)
  created_at  timestamptz not null default now()
);

create index if not exists briefs_user_created_idx
  on briefs (user_id, created_at desc);

create table if not exists copy_outputs (
  id                 uuid primary key default gen_random_uuid(),
  brief_id           uuid not null references briefs(id) on delete cascade,
  calendar_entry_id  text not null,         -- e.g. "mon-tiktok"
  copy_json          jsonb not null,
  created_at         timestamptz not null default now()
);

create index if not exists copy_outputs_brief_idx
  on copy_outputs (brief_id);

------------------------------------------------------------------------
-- api_keys — sha256-hashed bearer tokens for agent / MCP callers
------------------------------------------------------------------------
-- Storage model:
--   key_hash   = sha256(plaintext)         (unique; the only thing we keep)
--   key_prefix = first 13 chars of the key (for UI display: "cmo_live_abcd")
--   scopes     = text[] of canonical scopes from lib/scopes.ts
--   revoked_at = soft-delete; NULL means active
--
-- Soft-deletion preserves the audit trail in api_calls (api_key_id FK).
-- The per-user active-key cap (20) is enforced in app/api/keys/route.ts —
-- not as a DB constraint — so the 409 message can be specific.

create table if not exists api_keys (
  id            uuid primary key default gen_random_uuid(),
  user_id       text not null,              -- Clerk user id
  key_hash      text not null unique,       -- sha256 hex of plaintext
  key_prefix    text not null,              -- "cmo_live_abcd" (13 chars)
  name          text not null,              -- user-supplied label (1..64)
  scopes        text[] not null default array[]::text[],
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz,                -- throttled write; null until first use
  revoked_at    timestamptz                 -- soft delete
);

-- Hot path for resolveApiKey: lookup by hash, filter to active.
create index if not exists api_keys_active_hash_idx
  on api_keys (key_hash) where revoked_at is null;

-- Active-keys-per-user count and the /app/keys list page.
create index if not exists api_keys_user_idx
  on api_keys (user_id, created_at desc);

------------------------------------------------------------------------
-- api_calls — per-request usage log
------------------------------------------------------------------------
-- Written best-effort by lib/api-auth.ts:logApiCall. Never blocks the
-- user-facing request. api_key_id is nullable because session-cookie
-- callers (the web app) don't have one. Retain at least the current
-- billing window — older rows can be archived to cold storage.

create table if not exists api_calls (
  id           bigserial primary key,
  api_key_id   uuid references api_keys(id) on delete set null,
  user_id      text not null,
  endpoint     text not null,               -- "/api/strategy", "/api/copy", ...
  status       int  not null,
  duration_ms  int  not null,
  byok         boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists api_calls_user_created_idx
  on api_calls (user_id, created_at desc);

create index if not exists api_calls_key_created_idx
  on api_calls (api_key_id, created_at desc);

------------------------------------------------------------------------
-- Row-Level Security (defense in depth)
------------------------------------------------------------------------
-- All app traffic goes through the Supabase service-role key from our
-- Next.js server, which bypasses RLS — so under normal operation the
-- app-layer `.eq("user_id", userId)` filters in lib/supabase.ts ARE the
-- authorization boundary. RLS here is the second line of defense:
--   1. If anything ever exposes the anon key (an accidental NEXT_PUBLIC_*
--      leak, a misconfigured edge function, a future PostgREST endpoint),
--      we don't want every row in `briefs`/`api_keys` to be world-readable.
--   2. If a future code path forgets the user_id filter, RLS will reject
--      the query instead of leaking rows across tenants.
--
-- Policy stance: deny-by-default to the anon role. Service role bypasses
-- RLS so the existing app traffic is unaffected. If/when we add direct
-- Supabase client access from the browser (we don't today — every read
-- is server-rendered or routed through /api), we'll layer in per-user
-- policies that match auth.jwt() -> user_id against the row owner.

alter table briefs        enable row level security;
alter table copy_outputs  enable row level security;
alter table api_keys      enable row level security;
alter table api_calls     enable row level security;

-- Idempotent policy creation: drop-then-create so re-running this file
-- after a policy tweak doesn't error on "policy already exists."
drop policy if exists briefs_deny_anon       on briefs;
drop policy if exists copy_outputs_deny_anon on copy_outputs;
drop policy if exists api_keys_deny_anon     on api_keys;
drop policy if exists api_calls_deny_anon    on api_calls;

-- `using (false)` on the anon role means: no row is ever visible to
-- queries authenticated as anon (the public Supabase publishable key).
-- The service role used by getSupabaseServer() bypasses RLS and is
-- unaffected. Authenticated role (future Clerk-JWT-aware queries) is
-- intentionally NOT given a permissive policy here — we'll add scoped
-- policies when we actually wire client-side reads.
create policy briefs_deny_anon       on briefs       for all to anon using (false) with check (false);
create policy copy_outputs_deny_anon on copy_outputs for all to anon using (false) with check (false);
create policy api_keys_deny_anon     on api_keys     for all to anon using (false) with check (false);
create policy api_calls_deny_anon    on api_calls    for all to anon using (false) with check (false);
