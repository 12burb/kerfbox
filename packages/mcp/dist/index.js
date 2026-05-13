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
 *   KERFBOX_API_KEY   — issued from https://kerfbox.vercel.app/app/keys
 *   CMOBOX_API_KEY    — legacy alias, still honored
 *
 * Optional env:
 *   ANTHROPIC_API_KEY — your own Anthropic key. When set, inference uses it
 *                       (BYOK) and you pay Anthropic directly.
 *   KERFBOX_BASE_URL  — override for self-hosted or staging; defaults to
 *                       https://kerfbox.vercel.app
 *   CMOBOX_BASE_URL   — legacy alias.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { z } from "zod";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
// Read our own version from package.json so the User-Agent never drifts
// out of sync with what's published. Using readFileSync (instead of an
// `import ... with { type: "json" }` attribute) keeps us compatible with
// every Node 18+ runtime, including older 18.x where import attributes
// behave differently.
const PKG = JSON.parse(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "..", "package.json"), "utf8"));
const BASE_URL = process.env.KERFBOX_BASE_URL ??
    process.env.CMOBOX_BASE_URL ??
    "https://kerfbox.vercel.app";
const API_KEY = process.env.KERFBOX_API_KEY ?? process.env.CMOBOX_API_KEY;
// BYOK: prefer the namespaced env (KERFBOX_BYOK_ANTHROPIC_KEY) so this
// server doesn't collide with an unrelated Anthropic key the user has
// in their global env for some other tool. Fall back to the bare name
// for back-compat — but emit a one-time warning so users migrate.
const BYOK = process.env.KERFBOX_BYOK_ANTHROPIC_KEY ?? process.env.ANTHROPIC_API_KEY;
if (!process.env.KERFBOX_BYOK_ANTHROPIC_KEY && process.env.ANTHROPIC_API_KEY) {
    process.stderr.write("[kerfbox-mcp] using ANTHROPIC_API_KEY — please rename to " +
        "KERFBOX_BYOK_ANTHROPIC_KEY in your MCP host config to avoid " +
        "colliding with other tools that read ANTHROPIC_API_KEY.\n");
}
const MISSING_KEY_HINT = "KERFBOX_API_KEY (or legacy CMOBOX_API_KEY) is not set. Issue one at " +
    "https://kerfbox.vercel.app/app/keys and add it to the `env` block of " +
    "your MCP host config (Claude Desktop, Cursor, etc.), then restart.";
// Surface the warning early so a developer running the server interactively
// sees it on stderr. We do NOT exit here — exiting kills the transport
// before the host can read tools/list, and the user just sees an opaque
// "server failed to start" message. Instead we keep the server alive and
// fail individual tool calls with a clear, actionable error.
if (!API_KEY) {
    process.stderr.write(`[kerfbox-mcp] ${MISSING_KEY_HINT}\n`);
}
function authHeaders() {
    if (!API_KEY) {
        // Thrown errors bubble to the tool's try/catch and become isError
        // responses, so the MCP host shows the message verbatim.
        throw new Error(MISSING_KEY_HINT);
    }
    const h = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
        "User-Agent": `kerfbox-mcp/${PKG.version}`,
    };
    if (BYOK)
        h["X-Anthropic-Key"] = BYOK;
    return h;
}
/* ---------------------------------------------------------------------- */
/* Tool implementations                                                    */
/* ---------------------------------------------------------------------- */
/**
 * Drain an SSE stream from /api/strategy and return the final kerf.
 * The MCP transport doesn't stream tool output, so we collect-then-return.
 *
 * Accepts both `kerf` and legacy `brief` event types so old backends keep
 * working through the v0.1 → v0.2 deprecation window.
 */
async function cutKerf(args) {
    const res = await fetch(`${BASE_URL}/api/strategy`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(args),
    });
    if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`/api/strategy failed (${res.status}): ${txt.slice(0, 500)}`);
    }
    if (!res.body)
        throw new Error("/api/strategy returned no body");
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let kerf = null;
    let lastError = null;
    // Runtime guard: JSON.parse returns `any`, so we must validate the
    // event shape before branching. The server sends our own SSEEvent
    // schema, but we can't trust the wire — defense in depth.
    const isObj = (v) => typeof v === "object" && v !== null;
    try {
        while (true) {
            const { value, done } = await reader.read();
            if (done)
                break;
            // Normalize CRLF → LF so the `\n\n` frame delimiter works even if
            // an intermediate proxy rewrote line endings.
            buf = (buf + decoder.decode(value, { stream: true })).replace(/\r\n/g, "\n");
            let idx;
            while ((idx = buf.indexOf("\n\n")) !== -1) {
                const chunk = buf.slice(0, idx);
                buf = buf.slice(idx + 2);
                for (const line of chunk.split("\n")) {
                    // SSE frames can carry `event:` lines too, but our server
                    // encodes the event type inside the JSON payload's `type`
                    // field — we only need `data:` lines.
                    if (!line.startsWith("data:"))
                        continue;
                    const json = line.slice(5).trim();
                    if (!json)
                        continue;
                    let event;
                    try {
                        event = JSON.parse(json);
                    }
                    catch {
                        continue; // malformed line — ignore
                    }
                    if (!isObj(event) || typeof event.type !== "string")
                        continue;
                    if (event.type === "kerf") {
                        kerf = event.kerf;
                    }
                    else if (event.type === "brief") {
                        // Legacy v0.1 event — still emit it as a kerf payload so the
                        // tool result remains uniform for callers across versions.
                        kerf = event.brief;
                    }
                    else if (event.type === "error" && typeof event.message === "string") {
                        lastError = event.message;
                    }
                    // step events are dropped — MCP doesn't stream tool progress.
                }
            }
        }
    }
    finally {
        // Always release the lock so the underlying connection can be reaped
        // even if a parse step or the read loop itself throws.
        reader.releaseLock();
    }
    if (lastError)
        throw new Error(lastError);
    if (!kerf)
        throw new Error("Stream ended without a kerf.");
    return kerf;
}
async function generateCopy(args) {
    // /api/copy in v0.2 only accepts `kerf` — there's no legacy alias on
    // this route. The Zod schema below rejects callers who pass `brief`
    // before we get here.
    const body = { kerf: args.kerf, entry: args.entry, demo: args.demo };
    const res = await fetch(`${BASE_URL}/api/copy`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`/api/copy failed (${res.status}): ${txt.slice(0, 500)}`);
    }
    const json = (await res.json());
    if (json.error)
        throw new Error(json.error);
    return json.copy;
}
async function listKerfs() {
    const res = await fetch(`${BASE_URL}/api/briefs`, {
        method: "GET",
        headers: authHeaders(),
    });
    if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`/api/briefs failed (${res.status}): ${txt.slice(0, 500)}`);
    }
    // Backend returns `{kerfs, briefs}` (briefs is a v0.1 alias). Prefer kerfs.
    const json = (await res.json());
    return json.kerfs ?? json.briefs ?? [];
}
async function getKerf(args) {
    const res = await fetch(`${BASE_URL}/api/briefs/${encodeURIComponent(args.id)}`, {
        method: "GET",
        headers: authHeaders(),
    });
    if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`/api/briefs/${args.id} failed (${res.status}): ${txt.slice(0, 500)}`);
    }
    const json = (await res.json());
    if (json.error)
        throw new Error(json.error);
    return json.kerf ?? json.brief;
}
/* ---------------------------------------------------------------------- */
/* Argument schemas                                                        */
/*                                                                         */
/* The JSON Schemas in `inputSchema` below are advisory — most MCP hosts   */
/* (including Claude Desktop and Cursor) do NOT validate tool arguments    */
/* before forwarding them to the server. We re-validate at the boundary    */
/* with Zod so a buggy or malicious client can't pass `{ url: 123 }` and   */
/* see a confusing 400 from our backend instead of a clean error here.    */
/* ---------------------------------------------------------------------- */
const CutKerfArgs = z.object({
    url: z.string().min(1, "url is required"),
    audience: z.string().min(1, "audience is required"),
    demo: z.boolean().optional(),
});
const GenerateCopyArgs = z.object({
    // Only `kerf` is accepted in v0.2 — the /api/copy backend dropped the
    // legacy `brief` alias, so forwarding one would return 400. If a v0.1
    // caller still passes `brief`, this Zod check produces a cleaner error
    // than a confusing backend 400.
    kerf: z.record(z.string(), z.unknown()),
    entry: z.record(z.string(), z.unknown()),
    demo: z.boolean().optional(),
});
const GetKerfArgs = z.object({
    id: z.string().min(1, "id is required"),
});
const ListKerfsArgs = z.object({}).strict();
function parseArgs(schema, args, toolName) {
    const parsed = schema.safeParse(args ?? {});
    if (!parsed.success) {
        const issues = parsed.error.issues
            .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
            .join("; ");
        throw new Error(`Invalid arguments for ${toolName}: ${issues}`);
    }
    return parsed.data;
}
/* ---------------------------------------------------------------------- */
/* MCP wiring                                                              */
/*                                                                         */
/* Tool surface uses the v0.2 names (cut_kerf, list_kerfs, get_kerf) but   */
/* we ALSO advertise the v0.1 names (generate_brief, list_briefs,          */
/* get_brief) as deprecated aliases so existing agent configs keep working */
/* through the deprecation window. Aliases are routed to the same impls.   */
/* ---------------------------------------------------------------------- */
const TOOLS = [
    {
        name: "cut_kerf",
        description: "Cut a Kerf — the v0.2 strategic artifact. Live web research maps where " +
            "the category clusters today (named competitors), names the narrow " +
            "defensible cut between clusters, and ships a wedge with a structural " +
            "moat that names a specific competitor and explains why they can't " +
            "follow. If the moat is undefendable, the route returns 422 with a " +
            "reason — the brand POV is enforced in code. Returns: {company_summary, " +
            "cluster_map, kerf, wedge:{claim, proof, moat}, signals, concepts, " +
            "calendar}.",
        inputSchema: {
            type: "object",
            properties: {
                url: {
                    type: "string",
                    description: "URL of the product/company to analyze (e.g. https://linear.app)",
                },
                audience: {
                    type: "string",
                    description: "The target audience in plain English (e.g. 'Indie SaaS founders shipping their first $1k MRR')",
                },
                demo: {
                    type: "boolean",
                    description: "If true, returns a canned demo Kerf without running live research. Use for testing.",
                    default: false,
                },
            },
            required: ["url", "audience"],
        },
    },
    {
        name: "generate_copy",
        description: "Generate platform-ready post copy (hook + caption + visual direction + " +
            "hashtags + CTA) for a single calendar entry from a Kerf. Pass the full " +
            "Kerf and the specific calendar entry you want copy for. Copy is shaped " +
            "to hold the wedge — it should be implausible for a competitor in the " +
            "cluster to post the same content credibly. Returns JSON with: hook, " +
            "caption, visual_direction, hashtags, cta.",
        inputSchema: {
            type: "object",
            properties: {
                kerf: {
                    type: "object",
                    description: "The full Kerf object returned by cut_kerf.",
                },
                entry: {
                    type: "object",
                    description: "The calendar entry you want copy for. Must include day, time, platform, concept_id, post_idea, rationale.",
                },
                demo: {
                    type: "boolean",
                    description: "If true, returns canned demo copy. Use for testing.",
                    default: false,
                },
            },
            required: ["kerf", "entry"],
        },
    },
    {
        name: "list_kerfs",
        description: "List the caller's saved Kerfs (newest first, max 50). Returns an array " +
            "of {id, url, audience, brief_json, created_at} — brief_json holds the " +
            "stored Kerf payload (or a legacy v0.1 brief for older rows).",
        inputSchema: { type: "object", properties: {} },
    },
    {
        name: "get_kerf",
        description: "Fetch one saved Kerf by id (caller-scoped).",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "string", description: "The Kerf id (uuid)." },
            },
            required: ["id"],
        },
    },
    // ---- Deprecated v0.1 aliases (still routed to same impls) ----
    {
        name: "generate_brief",
        description: "(Deprecated v0.1 alias for cut_kerf. Same args, same return. Use cut_kerf.)",
        inputSchema: {
            type: "object",
            properties: {
                url: { type: "string" },
                audience: { type: "string" },
                demo: { type: "boolean", default: false },
            },
            required: ["url", "audience"],
        },
    },
    {
        name: "list_briefs",
        description: "(Deprecated v0.1 alias for list_kerfs.)",
        inputSchema: { type: "object", properties: {} },
    },
    {
        name: "get_brief",
        description: "(Deprecated v0.1 alias for get_kerf.)",
        inputSchema: {
            type: "object",
            properties: { id: { type: "string" } },
            required: ["id"],
        },
    },
];
const server = new Server(
// Server name is the short brand, not the npm package name —
// hosts surface this string to users.
{ name: "kerfbox", version: PKG.version }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));
server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;
    try {
        let result;
        switch (name) {
            case "cut_kerf":
            case "generate_brief":
                result = await cutKerf(parseArgs(CutKerfArgs, args, name));
                break;
            case "generate_copy":
                result = await generateCopy(parseArgs(GenerateCopyArgs, args, name));
                break;
            case "list_kerfs":
            case "list_briefs":
                parseArgs(ListKerfsArgs, args, name);
                result = await listKerfs();
                break;
            case "get_kerf":
            case "get_brief":
                result = await getKerf(parseArgs(GetKerfArgs, args, name));
                break;
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
            isError: true,
            content: [{ type: "text", text: `Error: ${msg}` }],
        };
    }
});
const transport = new StdioServerTransport();
server
    .connect(transport)
    .then(() => {
    process.stderr.write(`[kerfbox-mcp] connected → ${BASE_URL}\n`);
})
    .catch((err) => {
    process.stderr.write(`[kerfbox-mcp] failed to start: ${String(err)}\n`);
    process.exit(1);
});
