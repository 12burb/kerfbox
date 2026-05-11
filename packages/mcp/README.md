# @kerfbox/mcp

MCP server for [kerf.box](https://cmoinabox.vercel.app) — strategy is a cut, not a story.

This is the **agentic-as-a-service** entrypoint. Your agent (Claude Desktop,
Cursor, Continue, custom Agent SDK build, or anything MCP-aware) connects to
this server and gains four tools:

- `cut_kerf` — cut the narrow defensible Kerf between where a category
  clusters and where this brand can stand alone. Returns
  `{cluster_map, kerf, wedge:{claim, proof, moat}, signals, concepts, calendar}`.
- `generate_copy` — platform-ready hook/caption/CTA for one calendar entry
- `list_kerfs` — list your saved Kerfs
- `get_kerf` — fetch one Kerf by id

The route refuses to ship any Kerf whose `wedge.moat` does not name a
specific competitor from the cluster map and give a structural reason
they can't follow. The refusal is the brand POV expressed in code —
better a clean 422 than a "we'll execute better" non-moat.

Every research finding ships with verifiable web-search citations. All
output is schema-validated JSON — no string-parsing, no hallucinated URLs.

> **v0.1 → v0.2 deprecation.** The old tool names `generate_brief`,
> `list_briefs`, and `get_brief` still resolve as deprecated aliases,
> but new code should use `cut_kerf` / `list_kerfs` / `get_kerf`. The
> aliases will be removed in v0.3.

---

## Install

```bash
# No global install required — Claude Desktop / Cursor will run via npx.
```

## Configure

You need an API key from kerf.box:

1. Sign in at https://cmoinabox.vercel.app
2. Go to **/app/keys** (or call `POST /api/keys` with `{ name }`)
3. Copy the `cmo_live_...` key (shown once, store it in your password manager)

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`
(macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "kerfbox": {
      "command": "npx",
      "args": ["-y", "@kerfbox/mcp"],
      "env": {
        "KERFBOX_API_KEY": "cmo_live_...",
        "KERFBOX_BYOK_ANTHROPIC_KEY": "sk-ant-..."
      }
    }
  }
}
```

Restart Claude Desktop. You'll see a `kerfbox` tool indicator in the
input bar — your agent now has marketing-strategy capabilities.

### Cursor

Add to `.cursor/mcp.json` in your project (or globally):

```json
{
  "mcpServers": {
    "kerfbox": {
      "command": "npx",
      "args": ["-y", "@kerfbox/mcp"],
      "env": {
        "KERFBOX_API_KEY": "cmo_live_...",
        "KERFBOX_BYOK_ANTHROPIC_KEY": "sk-ant-..."
      }
    }
  }
}
```

### Custom Agent SDK build

```ts
import { ClaudeAgentSDK } from "@anthropic-ai/agent-sdk";

const agent = new ClaudeAgentSDK({
  mcpServers: {
    kerfbox: {
      command: "npx",
      args: ["-y", "@kerfbox/mcp"],
      env: {
        KERFBOX_API_KEY: process.env.KERFBOX_API_KEY!,
        KERFBOX_BYOK_ANTHROPIC_KEY: process.env.KERFBOX_BYOK_ANTHROPIC_KEY!,
      },
    },
  },
});
```

---

## BYOK (Bring Your Own Key)

If you set `KERFBOX_BYOK_ANTHROPIC_KEY`, all inference uses **your**
Anthropic key — you pay Anthropic directly. kerf.box charges a flat
methodology subscription; we never see your tokens.

If you omit it, kerf.box uses its own pooled key and the call counts
against your plan's monthly quota.

> Legacy `ANTHROPIC_API_KEY` is still honored for back-compat, but
> emits a stderr warning. Migrate to `KERFBOX_BYOK_ANTHROPIC_KEY` so
> this server doesn't collide with other tools that read the bare
> `ANTHROPIC_API_KEY`.

---

## Environment

| Variable                        | Required | Description                                                   |
| ------------------------------- | -------- | ------------------------------------------------------------- |
| `KERFBOX_API_KEY`               | yes      | API key issued at /app/keys (`cmo_live_...`)                  |
| `KERFBOX_BYOK_ANTHROPIC_KEY`    | no       | Your Anthropic key for BYOK billing                           |
| `KERFBOX_BASE_URL`              | no       | Override the API base (default: https://cmoinabox.vercel.app) |
| `CMOBOX_API_KEY` (legacy)       | no       | Alias for `KERFBOX_API_KEY`                                   |
| `ANTHROPIC_API_KEY` (legacy)    | no       | Alias for `KERFBOX_BYOK_ANTHROPIC_KEY` (warns on use)         |
| `CMOBOX_BASE_URL` (legacy)      | no       | Alias for `KERFBOX_BASE_URL`                                  |

---

## Why this exists

kerf.box is the central hub for marketing strategy that an agent can
plug into. We're not the agent — we're the slot the agent slides into
when it needs to think about marketing.

- **Schema-validated output:** Zod-enforced `KerfSchema` and `CopySchema`.
  Your agent gets parsed JSON, not a string it has to coerce.
- **Forced-citation research:** every signal ships with `web_search`
  citations. Your agent never has to verify URLs.
- **Refusal-as-feature:** the route rejects any Kerf whose moat doesn't
  name a specific competitor with a structural reason. The brand POV is
  enforced in code, not in marketing copy.
- **Persistent archive:** Kerfs are saved to your account and queryable
  across sessions.
- **Opinionated workflow:** cluster map → kerf → wedge (claim+proof+moat)
  → concepts → calendar → copy. The order is enforced.

---

## License

MIT
