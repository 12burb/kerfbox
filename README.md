# kerf.box

**Strategy is a cut, not a story.**

[kerf.box](https://kerfbox.vercel.app) maps where a category clusters today,
finds the narrow defensible cut between those clusters, and ships a wedge with a
structural moat. If the moat doesn't hold, **the system refuses to ship** — it
returns `422` with a reason instead of generating undefendable positioning.

It's a web app, a public JSON API, and an MCP server, so a human or an agent can
cut a kerf the same way.

---

## The Kerf method

Borrowed from woodworking — a *kerf* is the narrow slot a saw makes. The pipeline:

1. **cluster_map** — where the category clusters today (named competitors).
2. **kerf** — the narrow defensible cut between clusters.
3. **wedge** — a claim that fits the kerf, proven, with a structural moat.
4. **concepts** — executions that *embody* the wedge (not free-floating ideas).
5. **calendar** — a 7-day rollout.

The **refusal rule** is the opinionated core: after generation, `wedge.moat` is
checked against the cluster map. If it doesn't reference a real competitor, or
reduces to "we'll execute better," the request is rejected. The brand POV — that
undefendable strategy is worse than no strategy — is enforced in code, not in a
prompt.

---

## Stack

- **Next.js 15** (App Router, React 19) on **Vercel**
- **Clerk** for auth (Google sign-in)
- **Supabase** (Postgres) for persistence, service-role + RLS deny-all
- **Anthropic** Claude for inference (research + copy), with **BYOK** support
- **Upstash Redis** (or Vercel KV) for distributed rate limiting; falls back to
  an in-memory limiter when unconfigured
- **MCP server** published as [`@kerfbox/mcp`](packages/mcp)

---

## Local development

Requires Node ≥ 18.17 and [pnpm](https://pnpm.io).

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

The app degrades gracefully when integrations are missing: with no Clerk keys it
renders without auth, with no Anthropic key it serves demo content, and with no
Upstash config it rate-limits in memory. None of the secrets below are required
just to boot the UI.

### Environment variables

Create `.env.local` (never commit it — `.env*.local` is gitignored). In
production these live in Vercel project settings, stored as Sensitive.

**Inference**

| Variable | Purpose |
| --- | --- |
| `ANTHROPIC_API_KEY` | Server-side Anthropic key. Without it, routes serve demo content unless the caller brings their own key (BYOK). |
| `KERFBOX_STRATEGY_MODEL` | Optional. Override the strategy/research model. |
| `KERFBOX_COPY_MODEL` | Optional. Override the copy model. |

**Auth (Clerk)**

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key. |
| `CLERK_SECRET_KEY` | Clerk secret key. |

**Database (Supabase)**

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` | Project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only service-role key (never exposed to the client). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key (optional; client reads go through the API). |

**Rate limiting (optional)**

| Variable | Purpose |
| --- | --- |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Upstash REST limiter. |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Vercel KV alternative. |

**Site**

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin for metadata/sitemap. Defaults to `https://kerfbox.vercel.app`. |

> Note: `CMOBOX_*` and `KERFBOX_API_KEY`/`KERFBOX_BASE_URL` names are accepted as
> back-compat aliases for tooling configured before the rename. New setups should
> use the names above.

---

## Public API

Base URL: `https://kerfbox.vercel.app`. OpenAPI 3.1 spec at
[`/api/openapi.json`](https://kerfbox.vercel.app/api/openapi.json).

**Auth** — either a Clerk session (browser) or an API key:

```
Authorization: Bearer cmo_live_...
```

Keys are minted in the app at `/app/keys`, scoped (`copy:write`, `briefs:read`,
`briefs:write`, …), and stored only as a one-way hash. **BYOK:** pass
`X-Anthropic-Key` on any inference call to use your own Anthropic key — it is
never stored, logged, or proxied anywhere readable.

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/strategy` | POST | Cut a kerf (streams the cluster map → kerf → wedge). |
| `/api/copy` | POST | Generate platform copy for one calendar entry. |
| `/api/briefs` | GET / POST | List or save kerfs to your archive. |
| `/api/keys` | GET / POST | List or mint API keys (session-only). |

Example:

```bash
curl -N https://kerfbox.vercel.app/api/strategy \
  -H "Authorization: Bearer cmo_live_..." \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","audience":"indie founders"}'
```

---

## MCP server

Agents (Claude Desktop, Cursor, custom Agent SDK builds) can call kerf.box over
the Model Context Protocol:

```bash
npx -y @kerfbox/mcp
```

Tools: `cut_kerf`, `generate_copy`, `list_kerfs`, `get_kerf`. BYOK works on every
tool. See [`packages/mcp`](packages/mcp) for configuration.

---

## Security posture

- Input URLs are validated to `http(s)` schemes only (SSRF/XSS guard).
- Request bodies are size-capped before parsing (DoS guard).
- State-changing session endpoints enforce a CSRF Origin check; key-management
  endpoints are session-only and can't be driven by a Bearer token.
- API keys are hashed; secrets are scrubbed from logs.
- Security headers (CSP, `frame-ancestors`, etc.) are set in `next.config.mjs`.

Found a vulnerability? Please report it via the
[issue tracker](https://github.com/12burb/cmoinabox/issues).

---

## Deployment

Deployed on Vercel. Production alias is pinned to `kerfbox.vercel.app` in
[`vercel.json`](vercel.json). Push to `main` to deploy.
