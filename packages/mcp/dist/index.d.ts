#!/usr/bin/env node
/**
 * kerf.box MCP server.
 *
 * Exposes the Kerf method as MCP tools to MCP-aware agents (Claude Desktop,
 * Cursor, Continue, custom Agent SDK builds, etc.). All inference runs against
 * the kerf.box backend.
 *
 * kerf.box is account-free: there is NO API key to issue and no login. Live
 * inference runs on your OWN Anthropic key (BYOK), passed through per call
 * and never stored by kerf.box. Without a key you can still call the tools
 * with `demo: true` for canned content.
 *
 * Optional env:
 *   KERFBOX_BYOK_ANTHROPIC_KEY — your own Anthropic key (BYOK). Required for
 *                       live (non-demo) inference. Preferred over the bare
 *                       ANTHROPIC_API_KEY so this server doesn't collide with
 *                       an Anthropic key another tool reads from the global env.
 *   ANTHROPIC_API_KEY — legacy fallback for the BYOK key (emits a warning).
 *   KERFBOX_BASE_URL  — override for self-hosted or staging; defaults to
 *                       https://kerfbox.vercel.app
 *   CMOBOX_BASE_URL   — legacy alias.
 */
export {};
