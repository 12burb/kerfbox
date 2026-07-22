# kerf.box

**Strategy is a cut, not a story.**

[kerf.box](https://kerfbox.vercel.app) maps where a category clusters today,
finds the narrow defensible cut between those clusters, and ships a wedge with a
structural moat. If the moat doesn't hold, **the system refuses to ship** — it
emits an `error` with a reason instead of generating undefendable positioning.

It's a web app, a public JSON API, and an MCP server, so a human or an agent can
cut a kerf the same way. It is **account-free**: no login, no API key, and no
server-side database. You bring your own AI provider key (BYOK) — Anthropic,
OpenAI, Gemini, Kimi, Qwen, DeepSeek, Groq, OpenRouter, Ollama, or any custom
OpenAI-compatible endpoint — saved kerfs live in your browser, and you can
self-host the whole thing.

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
- **No accounts, no database** — every page is public; saved kerfs live in the
  browser's `localStorage`, with JSON export/import to move them between devices
- **Any AI provider** for inference (research + copy), **BYOK** — the caller's
  own key is passed per request and never stored, logged, or proxied. Anthropic
  keys get live web research with citations; OpenAI-compatible providers
  (OpenAI, Gemini, Kimi, Qwen, DeepSeek, Groq, OpenRouter, Ollama, custom) run
  on model knowledge with no fabricated citations
- **Upstash Redis** (or Vercel KV) for distributed, per-IP rate limiting; falls
  back to an in-memory limiter when unconfigured
- **MCP server** on npm as [`kerfbox-mcp`](https://www.npmjs.com/package/kerfbox-mcp), source in-repo at [`packages/mcp`](packages/mcp)

---

## Local development

Requires Node ≥ 18.17 and [pnpm](https://pnpm.io).

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

There are no required secrets — kerf.box is account-free, so it boots with
nothing configured. With no server key it serves demo content (callers bring
their own AI provider key per request via BYOK), and with no Upstash config it
rate-limits in memory. Everything below is optional.

### Environment variables

Create `.env.local` (never commit it — `.env*.local` is gitignored). In
production these live in Vercel project settings, stored as Sensitive. See
[`.env.example`](.env.example) for the full annotated list.

**Inference (optional)**

| Variable | Purpose |
| --- | --- |
| `KERFBOX_ANTHROPIC_KEY` | Optional server-side Anthropic key for self-hosting. Without it, the hosted model is BYOK-only: live calls must carry the caller's own key, and demo content is served otherwise. Preferred over the bare name so it can't collide with other tools that auto-read `ANTHROPIC_API_KEY`. |
| `ANTHROPIC_API_KEY` | Legacy fallback for `KERFBOX_ANTHROPIC_KEY`. |
| `KERFBOX_STRATEGY_MODEL` | Optional. Override the strategy/research model. |
| `KERFBOX_COPY_MODEL` | Optional. Override the copy model. |

**Rate limiting (optional)**

| Variable | Purpose |
| --- | --- |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Upstash REST limiter. |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Vercel KV alternative. |

**Site (optional)**

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin for metadata/sitemap. Defaults to `https://kerfbox.vercel.app`. |

> Note: the MCP server takes its BYOK config from `KERFBOX_BYOK_API_KEY`,
> `KERFBOX_BYOK_PROVIDER`, `KERFBOX_BYOK_MODEL`, and `KERFBOX_BYOK_BASE_URL`.
> Legacy names (`KERFBOX_BYOK_ANTHROPIC_KEY`, bare `ANTHROPIC_API_KEY`, and
> `CMOBOX_BASE_URL` for `KERFBOX_BASE_URL`) are still honored. See
> [`packages/mcp`](packages/mcp).

---

## Public API

Base URL: `https://kerfbox.vercel.app`. OpenAPI 3.1 spec at
[`/api/openapi.json`](https://kerfbox.vercel.app/api/openapi.json).

**The API is open** — no login and no API key. For live inference, pass your own
AI provider key per request via the `X-Provider` + `X-Api-Key` headers (BYOK);
it is never stored, logged, or proxied anywhere readable. Optional `X-Model`
and `X-Base-Url` headers override the model and endpoint. The legacy
`X-Anthropic-Key` header still works as Anthropic shorthand. Or set
`"demo": true` in the body for canned content with no key. Rate limiting is
per-IP.

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/strategy` | POST | Cut a kerf (SSE stream: cluster map → kerf → wedge). |
| `/api/copy` | POST | Generate platform copy for one calendar entry. |

Saving a kerf happens client-side in the browser (`localStorage`) — there are no
archive endpoints on the server.

Example:

```bash
# any provider works — anthropic, openai, gemini, kimi, qwen,
# deepseek, groq, openrouter, ollama, custom
curl -N https://kerfbox.vercel.app/api/strategy \
  -H "X-Provider: anthropic" \
  -H "X-Api-Key: sk-ant-..." \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","audience":"indie founders"}'
```

---

## MCP server

Agents (Claude Desktop, Cursor, custom Agent SDK builds) can call kerf.box over
the Model Context Protocol:

```bash
npx -y kerfbox-mcp
```

Tools: `cut_kerf` and `generate_copy`. No API key needed; set
`KERFBOX_BYOK_API_KEY` (plus `KERFBOX_BYOK_PROVIDER` for non-Anthropic keys)
for live inference, or call with `demo: true`. See
[`packages/mcp`](packages/mcp) for configuration.

---

## Security posture

- Input URLs are validated to `http(s)` schemes only (SSRF/XSS guard).
- Request bodies are size-capped before parsing (DoS guard).
- The API is open and rate-limited per IP — there are no sessions, accounts, or
  stored credentials to protect.
- BYOK keys are used for a single request and never stored or proxied; secrets
  (`sk-ant-…`, `sk-…`, `gsk_…`, `AIza…`, the `X-Api-Key` / `X-Anthropic-Key`
  headers, etc.) are scrubbed from logs.
- Security headers (CSP, `frame-ancestors`, etc.) are set in `next.config.mjs`.

Found a vulnerability? Please report it via the
[issue tracker](https://github.com/12burb/kerfbox/issues).

---

## Deployment

Deployed on Vercel. Production alias is pinned to `kerfbox.vercel.app` in
[`vercel.json`](vercel.json). Push to `main` to deploy.

---

## License

MIT — see [`LICENSE`](LICENSE). Free for anyone to use, self-host, fork, or
build on. The MCP server in [`packages/mcp`](packages/mcp) is MIT-licensed too.
