#!/usr/bin/env node
/**
 * kerf.box MCP server.
 *
 * Exposes the Kerf method as MCP tools to MCP-aware agents (Claude Desktop,
 * Cursor, Continue, custom Agent SDK builds, etc.). All inference runs against
 * the kerf.box backend; the user's KERFBOX_API_KEY (alias: CMOBOX_API_KEY)
 * authorizes the call and an optional ANTHROPIC_API_KEY (BYOK) lets the user
 * pay Anthropic directly instead of consuming the kerf.box quota.
 *
 * Required env (either name works — KERFBOX_* takes precedence):
 *   KERFBOX_API_KEY   — issued from https://cmoinabox.vercel.app/app/keys
 *   CMOBOX_API_KEY    — legacy alias, still honored
 *
 * Optional env:
 *   ANTHROPIC_API_KEY — your own Anthropic key. When set, inference uses it
 *                       (BYOK) and you pay Anthropic directly.
 *   KERFBOX_BASE_URL  — override for self-hosted or staging; defaults to
 *                       https://cmoinabox.vercel.app
 *   CMOBOX_BASE_URL   — legacy alias.
 */
export {};
