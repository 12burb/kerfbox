#!/usr/bin/env node
/**
 * kerf.box MCP server.
 *
 * Exposes the Kerf method as MCP tools to MCP-aware agents (Claude Desktop,
 * Cursor, Continue, custom Agent SDK builds, etc.). All inference runs against
 * the kerf.box backend.
 *
 * kerf.box is account-free: there is NO API key to issue and no login. Live
 * inference runs on your OWN AI provider key (BYOK) — any provider — passed
 * through per call and never stored by kerf.box. Without a key you can still
 * call the tools with `demo: true` for canned content.
 *
 * Optional env:
 *   KERFBOX_BYOK_PROVIDER — which provider the key belongs to: anthropic
 *                       (default), openai, gemini, kimi, qwen, deepseek,
 *                       groq, openrouter, ollama, custom. Anthropic runs
 *                       live web research with citations; everything else
 *                       cuts from model knowledge.
 *   KERFBOX_BYOK_API_KEY — your own key for that provider. Required for
 *                       live (non-demo) inference on keyed providers;
 *                       optional for ollama/custom.
 *   KERFBOX_BYOK_MODEL — optional model override (e.g. gpt-5.1-mini).
 *   KERFBOX_BYOK_BASE_URL — OpenAI-compatible endpoint URL; required for
 *                       provider=custom, optional override for ollama.
 *                       NOTE: the hosted backend can't reach your localhost —
 *                       point KERFBOX_BASE_URL at a locally-run kerf.box for
 *                       local models.
 *   KERFBOX_BYOK_ANTHROPIC_KEY — legacy (≤0.2) Anthropic-only key name;
 *                       still honored, implies provider=anthropic.
 *   ANTHROPIC_API_KEY — legacy fallback for the BYOK key (emits a warning).
 *   KERFBOX_BASE_URL  — override for self-hosted or staging; defaults to
 *                       https://kerfbox.vercel.app
 *   CMOBOX_BASE_URL   — legacy alias.
 */
export {};
