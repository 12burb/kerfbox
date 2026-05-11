import { NextResponse } from "next/server";
import { KNOWN_SCOPES, SCOPE_DESCRIPTIONS } from "@/lib/scopes";

export const runtime = "nodejs";

/**
 * GET /api/openapi.json — public OpenAPI 3.1 spec for the kerf.box public API.
 *
 * Hand-rolled (not generated from Zod) so the wire shape stays stable for
 * downstream consumers — Anthropic agents, MCP shims, Postman, etc. —
 * even when internal Zod schemas evolve.
 *
 * v0.2 introduces the Kerf shape; the v0.1 Brief shape is documented
 * alongside it as deprecated for the duration of the migration window.
 */
export function GET(req: Request) {
  // Build the server URL from the incoming request so the spec is correct
  // whether served from localhost, preview, or production.
  const origin = new URL(req.url).origin;

  const spec = {
    openapi: "3.1.0",
    info: {
      title: "kerf.box API",
      version: "0.2.0",
      description:
        "Strategic-cut API. Map where a category clusters, find the narrow defensible " +
        "kerf between clusters, and ship a wedge with a structural moat — or surface " +
        "an in-stream `error` SSE event if the moat doesn't hold. Designed to be " +
        "called by AI agents (via MCP or directly) as well as the kerf.box web app.",
      contact: { name: "kerf.box", url: "https://cmoinabox.vercel.app" },
      // OpenAPI 3.1 prefers SPDX `identifier` over the older `name`-only form.
      license: { name: "MIT", identifier: "MIT" },
    },
    servers: [{ url: origin }],
    security: [{ bearerAuth: [] }],
    tags: [
      { name: "strategy", description: "Cut Kerfs (SSE stream)" },
      { name: "copy", description: "Generate platform copy from a Kerf" },
      { name: "kerfs", description: "Persistent archive of saved Kerfs" },
    ],
    paths: {
      "/api/strategy": {
        post: {
          tags: ["strategy"],
          operationId: "cutKerf",
          summary: "Cut a Kerf for {url, audience}",
          description:
            "Streams Server-Sent Events. Events: `step` (research progress), `kerf` (final " +
            "payload), `error`. On success the final `kerf` event contains a `Kerf` object. " +
            "Pass `X-Anthropic-Key` to bring your own Anthropic key (BYOK).\n\n" +
            "**Error semantics:** The route opens the SSE stream on the first byte, so the " +
            "HTTP status is 200 for both success and refusal. Clients MUST branch on the " +
            "SSE event `type`, not the HTTP status, to detect failure. The only non-200 " +
            "responses are pre-stream errors: 400 (malformed request), 401 (auth), 403 " +
            "(scope), 429 (rate limit), 503 (no inference key available).\n\n" +
            "**Refusal rule:** if `wedge.moat` does not name a competitor from " +
            "`cluster_map` and give a structural reason, the route emits an `error` event " +
            "with a 'Kerf rejected' message. Re-run with sharper inputs.",
          parameters: [{ $ref: "#/components/parameters/AnthropicKeyHeader" }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/StrategyRequest" },
              },
            },
          },
          responses: {
            "200": {
              description: "Server-Sent Events stream of Kerf-cutting progress.",
              content: {
                "text/event-stream": {
                  schema: { $ref: "#/components/schemas/SSEEvent" },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "403": { $ref: "#/components/responses/Forbidden" },
            "429": { $ref: "#/components/responses/RateLimited" },
            "503": { $ref: "#/components/responses/Unavailable" },
          },
          "x-required-scope": "strategy:write",
        },
      },
      "/api/copy": {
        post: {
          tags: ["copy"],
          operationId: "generateCopy",
          summary: "Generate platform copy for one calendar entry",
          parameters: [{ $ref: "#/components/parameters/AnthropicKeyHeader" }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CopyRequest" },
              },
            },
          },
          responses: {
            "200": {
              description: "Generated copy.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["copy"],
                    properties: { copy: { $ref: "#/components/schemas/Copy" } },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "403": { $ref: "#/components/responses/Forbidden" },
            "429": { $ref: "#/components/responses/RateLimited" },
            "502": {
              description: "Upstream model returned malformed output.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "503": { $ref: "#/components/responses/Unavailable" },
          },
          "x-required-scope": "copy:write",
        },
      },
      "/api/briefs": {
        get: {
          tags: ["kerfs"],
          operationId: "listKerfs",
          summary: "List saved Kerfs (newest first, max 50)",
          description:
            "Returns both `kerfs` (v0.2 field) and `briefs` (deprecated v0.1 alias) — " +
            "they reference the same array. Prefer `kerfs` in new clients.",
          responses: {
            "200": {
              description: "Saved Kerfs for the authenticated caller.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["kerfs"],
                    properties: {
                      kerfs: {
                        type: "array",
                        items: { $ref: "#/components/schemas/SavedKerf" },
                      },
                      briefs: {
                        type: "array",
                        deprecated: true,
                        items: { $ref: "#/components/schemas/SavedKerf" },
                      },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "403": { $ref: "#/components/responses/Forbidden" },
            "503": { $ref: "#/components/responses/Unavailable" },
          },
          "x-required-scope": "briefs:read",
        },
        post: {
          tags: ["kerfs"],
          operationId: "saveKerf",
          summary: "Save a Kerf to the caller's archive",
          description:
            "Provide exactly one of `kerf` (v0.2, preferred) or `brief` (v0.1 legacy alias).",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["url", "audience"],
                  properties: {
                    url: { type: "string" },
                    audience: { type: "string" },
                    kerf: { $ref: "#/components/schemas/Kerf" },
                    brief: {
                      $ref: "#/components/schemas/Brief",
                      deprecated: true,
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Saved.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["id"],
                    properties: { id: { type: "string", format: "uuid" } },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "403": { $ref: "#/components/responses/Forbidden" },
            "503": { $ref: "#/components/responses/Unavailable" },
          },
          "x-required-scope": "briefs:write",
        },
      },
      "/api/briefs/{id}": {
        get: {
          tags: ["kerfs"],
          operationId: "getKerf",
          summary: "Fetch one saved Kerf by id",
          description:
            "Response includes both `kerf` (v0.2 field) and `brief` (v0.1 alias).",
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            "200": {
              description: "Saved Kerf.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["kerf"],
                    properties: {
                      kerf: { $ref: "#/components/schemas/SavedKerf" },
                      brief: {
                        $ref: "#/components/schemas/SavedKerf",
                        deprecated: true,
                      },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "403": { $ref: "#/components/responses/Forbidden" },
            "404": {
              description: "Not found (or not owned by caller).",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "503": { $ref: "#/components/responses/Unavailable" },
          },
          "x-required-scope": "briefs:read",
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "cmo_live_*",
          description:
            "API key with format `cmo_live_<32 base62 chars>`. Mint at /app/keys. " +
            "Web app callers may use a Clerk session cookie instead, but agent/MCP " +
            "callers should always use a Bearer token.",
        },
      },
      parameters: {
        AnthropicKeyHeader: {
          in: "header",
          name: "X-Anthropic-Key",
          required: false,
          schema: { type: "string" },
          description:
            "Optional: bring your own Anthropic key. When present, inference uses " +
            "this key instead of the kerf.box server key. Recommended for high-volume " +
            "agent traffic and required when calling from API keys against an " +
            "instance that has no server-side Anthropic key configured.",
        },
      },
      responses: {
        BadRequest: {
          description: "Invalid request body.",
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/Error" } },
          },
        },
        Unauthorized: {
          description: "Missing or invalid credentials.",
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/Error" } },
          },
        },
        Forbidden: {
          description: "API key is missing the required scope.",
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/Error" } },
          },
        },
        Unavailable: {
          description:
            "Inference unavailable (no Anthropic key on server, no BYOK provided) " +
            "or backing service not configured.",
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/Error" } },
          },
        },
        RateLimited: {
          description:
            "Per-caller rate limit exceeded. The response includes a `Retry-After` " +
            "header (seconds). Strategy = 10/hour, copy = 60/hour, keyed by user/api-key " +
            "or IP for anonymous BYOK callers.",
          headers: {
            "Retry-After": {
              schema: { type: "integer" },
              description: "Seconds until the next request will be accepted.",
            },
          },
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/Error" } },
          },
        },
      },
      schemas: {
        Error: {
          type: "object",
          required: ["error"],
          properties: { error: { type: "string" } },
        },
        Scope: {
          type: "string",
          enum: KNOWN_SCOPES,
          description:
            "API-key scope. Descriptions:\n" +
            KNOWN_SCOPES.map((s) => `- \`${s}\` — ${SCOPE_DESCRIPTIONS[s]}`).join("\n"),
        },
        StrategyRequest: {
          type: "object",
          required: ["url", "audience"],
          properties: {
            url: {
              type: "string",
              description: "Company / product landing page URL.",
              example: "https://linear.app",
            },
            audience: {
              type: "string",
              description: "Free-form target audience description.",
              example: "Indie SaaS founders shipping their first $1k MRR",
            },
            demo: {
              type: "boolean",
              description: "If true, returns a canned demo Kerf (no inference).",
              default: false,
            },
          },
        },
        CopyRequest: {
          type: "object",
          required: ["kerf", "entry"],
          description:
            "Generate copy for one calendar entry. `entry.concept_id` must reference " +
            "a concept inside the provided `kerf`. The v0.1 `brief` field is no " +
            "longer accepted — upgrade legacy callers to pass `kerf`.",
          properties: {
            kerf: { $ref: "#/components/schemas/Kerf" },
            entry: { $ref: "#/components/schemas/CalendarEntry" },
            demo: { type: "boolean", default: false },
          },
        },
        Citation: {
          type: "object",
          required: ["title", "url"],
          properties: {
            title: { type: "string" },
            url: { type: "string", format: "uri" },
          },
        },
        Signal: {
          type: "object",
          required: ["source", "finding"],
          properties: {
            source: { type: "string" },
            finding: { type: "string" },
            citations: {
              type: "array",
              items: { $ref: "#/components/schemas/Citation" },
            },
          },
        },
        Cluster: {
          type: "object",
          required: ["cluster", "examples", "pattern"],
          properties: {
            cluster: { type: "string" },
            examples: {
              type: "array",
              minItems: 2,
              items: { type: "string" },
              description: "Named competitors that occupy this cluster (min 2).",
            },
            pattern: { type: "string" },
          },
        },
        KerfCut: {
          type: "object",
          required: ["cut", "why_now"],
          properties: {
            cut: {
              type: "string",
              description: "The narrow defensible cut between clusters, one sentence.",
            },
            why_now: { type: "string" },
          },
        },
        Wedge: {
          type: "object",
          required: ["claim", "proof", "moat"],
          properties: {
            claim: { type: "string", description: "Taglinable claim, < 12 words." },
            proof: {
              type: "array",
              minItems: 2,
              items: { type: "string" },
              description: "Concrete reasons this brand can legitimately make the claim.",
            },
            moat: {
              type: "string",
              description:
                "Structural moat — must name a specific competitor from cluster_map and " +
                "explain why they can't follow. Otherwise /api/strategy emits an in-stream " +
                "`error` SSE event with a 'Kerf rejected' message (HTTP status is 200; " +
                "branch on the event type).",
            },
          },
        },
        Concept: {
          type: "object",
          required: ["id", "name", "embodies_wedge", "why_now", "hook"],
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            embodies_wedge: {
              type: "string",
              description: "How this concept IS the wedge in execution form.",
            },
            why_now: { type: "string" },
            hook: { type: "string" },
          },
        },
        CalendarEntry: {
          type: "object",
          required: ["day", "time", "platform", "concept_id", "post_idea", "rationale"],
          properties: {
            day: { type: "string" },
            time: { type: "string" },
            platform: { type: "string" },
            concept_id: { type: "string" },
            post_idea: { type: "string" },
            rationale: { type: "string" },
          },
        },
        Kerf: {
          type: "object",
          required: [
            "company_summary",
            "cluster_map",
            "kerf",
            "wedge",
            "signals",
            "concepts",
            "calendar",
          ],
          properties: {
            company_summary: { type: "string" },
            cluster_map: {
              type: "array",
              minItems: 1,
              items: { $ref: "#/components/schemas/Cluster" },
            },
            kerf: { $ref: "#/components/schemas/KerfCut" },
            wedge: { $ref: "#/components/schemas/Wedge" },
            signals: {
              type: "array",
              items: { $ref: "#/components/schemas/Signal" },
            },
            concepts: {
              type: "array",
              items: { $ref: "#/components/schemas/Concept" },
            },
            calendar: {
              type: "array",
              items: { $ref: "#/components/schemas/CalendarEntry" },
            },
          },
        },
        // Legacy v0.1 shapes — kept so old saved rows still validate.
        Positioning: {
          type: "object",
          deprecated: true,
          required: ["angle", "rationale"],
          properties: {
            angle: { type: "string" },
            rationale: { type: "string" },
          },
        },
        LegacyConcept: {
          type: "object",
          deprecated: true,
          required: ["id", "name", "why_now", "hook"],
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            why_now: { type: "string" },
            hook: { type: "string" },
          },
        },
        Brief: {
          type: "object",
          deprecated: true,
          description: "Legacy v0.1 strategy artifact. Use `Kerf` for new work.",
          required: [
            "company_summary",
            "research_findings",
            "market_gap",
            "positioning",
            "concepts",
            "calendar",
          ],
          properties: {
            company_summary: { type: "string" },
            research_findings: {
              type: "array",
              items: { $ref: "#/components/schemas/Signal" },
            },
            market_gap: { type: "string" },
            positioning: { $ref: "#/components/schemas/Positioning" },
            concepts: {
              type: "array",
              items: { $ref: "#/components/schemas/LegacyConcept" },
            },
            calendar: {
              type: "array",
              items: { $ref: "#/components/schemas/CalendarEntry" },
            },
          },
        },
        SavedKerf: {
          type: "object",
          required: ["id", "url", "audience", "brief_json", "created_at"],
          description:
            "DB row. The `brief_json` column holds either a Kerf (v0.2) or a Brief (v0.1).",
          properties: {
            id: { type: "string", format: "uuid" },
            url: { type: "string" },
            audience: { type: "string" },
            brief_json: {
              oneOf: [
                { $ref: "#/components/schemas/Kerf" },
                { $ref: "#/components/schemas/Brief" },
              ],
            },
            created_at: { type: "string", format: "date-time" },
          },
        },
        Copy: {
          type: "object",
          required: ["hook", "caption", "visual_direction", "hashtags", "cta"],
          properties: {
            hook: { type: "string" },
            caption: { type: "string" },
            visual_direction: { type: "string" },
            hashtags: { type: "array", items: { type: "string" } },
            cta: { type: "string" },
          },
        },
        SSEStepEvent: {
          type: "object",
          required: ["type", "label", "status"],
          properties: {
            type: { type: "string", enum: ["step"] },
            label: { type: "string" },
            finding: { type: "string" },
            status: { type: "string", enum: ["running", "done"] },
          },
        },
        SSEKerfEvent: {
          type: "object",
          required: ["type", "kerf"],
          properties: {
            type: { type: "string", enum: ["kerf"] },
            kerf: { $ref: "#/components/schemas/Kerf" },
          },
        },
        SSEErrorEvent: {
          type: "object",
          required: ["type", "message"],
          properties: {
            type: { type: "string", enum: ["error"] },
            message: { type: "string" },
          },
        },
        SSEEvent: {
          oneOf: [
            { $ref: "#/components/schemas/SSEStepEvent" },
            { $ref: "#/components/schemas/SSEKerfEvent" },
            { $ref: "#/components/schemas/SSEErrorEvent" },
          ],
          discriminator: {
            propertyName: "type",
            mapping: {
              step: "#/components/schemas/SSEStepEvent",
              kerf: "#/components/schemas/SSEKerfEvent",
              error: "#/components/schemas/SSEErrorEvent",
            },
          },
        },
      },
    },
  } as const;

  return NextResponse.json(spec, {
    headers: {
      // Cache aggressively at the edge — the spec is deterministic per build.
      "Cache-Control": "public, max-age=300, s-maxage=600",
    },
  });
}
