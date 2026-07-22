# kerfbox-mcp

MCP server for [kerf.box](https://kerfbox.vercel.app) — strategy is a cut, not a story.

This is the **agentic-as-a-service** entrypoint. Your agent (Claude Desktop,
Cursor, Continue, custom Agent SDK build, or anything MCP-aware) connects to
this server and gains two tools:

- `cut_kerf` — cut the narrow defensible Kerf between where a category
  clusters and where this brand can stand alone. Returns
  `{company_summary, cluster_map, kerf, wedge:{claim, proof, moat}, signals, concepts, calendar}`.
- `generate_copy` — platform-ready hook/caption/CTA for one calendar entry.

The route refuses to ship any Kerf whose `wedge.moat` does not name a
specific competitor from the cluster map and give a structural reason
they can't follow. The refusal is the brand POV expressed in code —
better a clean refusal than a "we'll execute better" non-moat.

All output is schema-validated JSON — no string-parsing, no hallucinated
URLs. With an Anthropic key, every research finding ships with verifiable
web-search citations; with any other provider key, the kerf is cut from
model knowledge and signals ship without citations (never fabricated ones).

> **Account-free.** kerf.box has no login and no API key to issue. Live
> inference runs on **your own** AI provider key (BYOK) — Anthropic, OpenAI,
> Gemini, Kimi, Qwen, DeepSeek, Groq, OpenRouter, Ollama, or any custom
> OpenAI-compatible endpoint — passed through per call and never stored.
> There is no server-side archive — your agent keeps whatever `cut_kerf`
> returns. The web app saves Kerfs in your browser's localStorage; nothing
> is persisted on the server.

> **v0.1 → v0.2 deprecation.** The old tool name `generate_brief` still
> resolves as a deprecated alias of `cut_kerf`, but new code should use
> `cut_kerf`. The archive tools (`list_kerfs`/`get_kerf`/`list_briefs`/
> `get_brief`) have been removed — kerf.box no longer keeps a server archive.

---

## Install

```bash
# No global install required — Claude Desktop / Cursor will run via npx.
```

## Configure

There is **no API key and no account** — just point your MCP host at the
server. For live inference, supply your own key via `KERFBOX_BYOK_API_KEY`
(plus `KERFBOX_BYOK_PROVIDER` if it isn't an Anthropic key). Without a key,
tools still work when called with `demo: true` (canned content).

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`
(macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "kerfbox": {
      "command": "npx",
      "args": ["-y", "kerfbox-mcp"],
      "env": {
        "KERFBOX_BYOK_API_KEY": "sk-ant-..."
      }
    }
  }
}
```

Using a non-Anthropic key? Name the provider:

```json
      "env": {
        "KERFBOX_BYOK_PROVIDER": "openai",
        "KERFBOX_BYOK_API_KEY": "sk-...",
        "KERFBOX_BYOK_MODEL": "gpt-5.1"
      }
```

Providers: `anthropic` (default — the only one with live web research),
`openai`, `gemini`, `kimi`, `qwen`, `deepseek`, `groq`, `openrouter`,
`ollama`, `custom`. `KERFBOX_BYOK_MODEL` is optional everywhere.

Restart Claude Desktop. You'll see a `kerfbox` tool indicator in the
input bar — your agent now has marketing-strategy capabilities.

### Cursor

Add to `.cursor/mcp.json` in your project (or globally):

```json
{
  "mcpServers": {
    "kerfbox": {
      "command": "npx",
      "args": ["-y", "kerfbox-mcp"],
      "env": {
        "KERFBOX_BYOK_API_KEY": "sk-ant-..."
      }
    }
  }
}
```

### Custom Agent SDK build

Using [`@anthropic-ai/claude-agent-sdk`](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk):

```ts
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "Cut a kerf for https://example.com targeting indie founders",
  options: {
    mcpServers: {
      kerfbox: {
        command: "npx",
        args: ["-y", "kerfbox-mcp"],
        env: {
          KERFBOX_BYOK_API_KEY: process.env.KERFBOX_BYOK_API_KEY!,
        },
      },
    },
    // MCP tools are named mcp__<server>__<tool>.
    allowedTools: ["mcp__kerfbox__cut_kerf", "mcp__kerfbox__generate_copy"],
  },
})) {
  if (message.type === "result") console.log(message.result);
}
```

---

## BYOK (Bring Your Own Key)

kerf.box never bills you and never holds a credential. If you set
`KERFBOX_BYOK_API_KEY`, all inference uses **your** key with **your**
chosen provider — you pay that provider directly, and the key is passed
through per request and never stored, logged, or proxied.

If you omit it, only `demo: true` calls succeed; live calls return `401`
(exception: `ollama`/`custom` can run keyless against your own endpoint).

**Local models (Ollama, LM Studio, vLLM):** the hosted backend at
kerfbox.vercel.app cannot reach your machine's localhost. Run kerf.box
locally (`git clone` + `pnpm dev`) and point `KERFBOX_BASE_URL` at
`http://localhost:3000`.

> Legacy `KERFBOX_BYOK_ANTHROPIC_KEY` (≤0.2) and bare `ANTHROPIC_API_KEY`
> are still honored as Anthropic keys; the latter emits a stderr warning.
> Migrate to `KERFBOX_BYOK_API_KEY`.

---

## Environment

| Variable                     | Required | Description                                                                                                    |
| ---------------------------- | -------- | -------------------------------------------------------------------------------------------------------------- |
| `KERFBOX_BYOK_API_KEY`       | no\*     | Your AI provider key (BYOK). Required for live inference on keyed providers; omit for demo.                     |
| `KERFBOX_BYOK_PROVIDER`      | no       | `anthropic` (default), `openai`, `gemini`, `kimi`, `qwen`, `deepseek`, `groq`, `openrouter`, `ollama`, `custom`. |
| `KERFBOX_BYOK_MODEL`         | no       | Model override (e.g. `gpt-5.1-mini`). Defaults to the provider's preset.                                        |
| `KERFBOX_BYOK_BASE_URL`      | no       | OpenAI-compatible endpoint URL. Required for `custom`; optional override for `ollama`.                          |
| `KERFBOX_BASE_URL`           | no       | Override the API base (default: https://kerfbox.vercel.app).                                                     |
| `KERFBOX_BYOK_ANTHROPIC_KEY` | no       | Legacy (≤0.2) Anthropic key name — still honored.                                                                |
| `ANTHROPIC_API_KEY` (legacy) | no       | Legacy fallback for the BYOK key (warns on use).                                                                 |
| `CMOBOX_BASE_URL` (legacy)   | no       | Alias for `KERFBOX_BASE_URL`.                                                                                    |

\* Required only for live (non-demo) inference on keyed providers. With no
key set, tools return `401` unless called with `demo: true`.

---

## Why this exists

kerf.box is the central hub for marketing strategy that an agent can
plug into. We're not the agent — we're the slot the agent slides into
when it needs to think about marketing.

- **Account-free:** no login, no API key, no server-side state. Bring
  a key from any AI provider or run in demo mode.
- **Schema-validated output:** Zod-enforced `KerfSchema` and `CopySchema`.
  Your agent gets parsed JSON, not a string it has to coerce.
- **Honest research:** with an Anthropic key, every signal ships with
  `web_search` citations. With any other provider, citations are omitted —
  never fabricated.
- **Refusal-as-feature:** the route rejects any Kerf whose moat doesn't
  name a specific competitor with a structural reason. The brand POV is
  enforced in code, not in marketing copy.
- **Opinionated workflow:** cluster map → kerf → wedge (claim+proof+moat)
  → concepts → calendar → copy. The order is enforced.

---

## License

MIT
