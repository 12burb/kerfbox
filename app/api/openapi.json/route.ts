import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET /api/openapi.json — public OpenAPI 3.1 spec for the kerf.box public API.
 *
 * Hand-rolled (not generated from Zod) so the wire shape stays stable for
 * downstream consumers — Anthropic agents, MCP shims, Postman, etc. —
 * even when internal Zod schemas evolve.
 *
 * The API is account-free and open: there is no login, no minted API key,
 * and no server-side persistence. Callers either bring their own Anthropic
 * key per request (`X-Anthropic-Key`, BYOK) for live inference, or pass
 * `demo: true` for canned content. Rate limiting is per-IP. Saving a Kerf
 * happens client-side in the browser (localStorage) — there are no archive
 * endpoints on the server.
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
        "called by AI agents (via MCP or directly) as well as the kerf.box web app.\n\n" +
        "**Account-free:** no login and no API key. Pass your own Anthropic key per " +
        "request via the `X-Anthropic-Key` header (BYOK) for live inference, or set " +
        "`demo: true` for canned content. Rate limiting is per-IP.",
      contact: { name: "kerf.box", url: "https://kerfbox.vercel.app" },
      // OpenAPI 3.1 prefers SPDX `identifier` over the older `name`-only form.
      license: { name: "MIT", identifier: "MIT" },
    },
    servers: [{ url: origin }],
    tags: [
      { name: "strategy", description: "Cut Kerfs (SSE stream)" },
      { name: "copy", description: "Generate platform copy from a Kerf" },
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
            "Pass `X-Anthropic-Key` to bring your own Anthropic key (BYOK), or set " +
            "`demo: true` for a canned Kerf.\n\n" +
            "**Error semantics:** The route opens the SSE stream on the first byte, so the " +
            "HTTP status is 200 for both success and refusal. Clients MUST branch on the " +
            "SSE event `type`, not the HTTP status, to detect failure. The only non-200 " +
            "responses are pre-stream errors: 400 (malformed request), 401 (no Anthropic " +
            "key and `demo` not set), 429 (rate limit).\n\n" +
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
            "429": { $ref: "#/components/responses/RateLimited" },
          },
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
            "429": { $ref: "#/components/responses/RateLimited" },
            "502": {
              description: "Upstream model returned malformed output.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },
    },
    components: {
      parameters: {
        AnthropicKeyHeader: {
          in: "header",
          name: "X-Anthropic-Key",
          required: false,
          schema: { type: "string" },
          description:
            "Bring your own Anthropic key (BYOK). When present, inference runs on this " +
            "key and it is never stored, logged, or proxied. Required for live inference " +
            "unless the instance is self-hosted with a server-side Anthropic key, or you " +
            "pass `demo: true`.",
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
          description:
            "Live inference was requested but no Anthropic key was provided (no " +
            "`X-Anthropic-Key` header, and no server key on this instance) and `demo` " +
            "was not set. Pass a BYOK key or set `demo: true`.",
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/Error" } },
          },
        },
        RateLimited: {
          description:
            "Per-IP rate limit exceeded. The response includes a `Retry-After` " +
            "header (seconds). Strategy = 10/hour, copy = 60/hour, keyed by client IP.",
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
              description: "If true, returns a canned demo Kerf (no inference, no key needed).",
              default: false,
            },
          },
        },
        CopyRequest: {
          type: "object",
          required: ["kerf", "entry"],
          description:
            "Generate copy for one calendar entry. `entry.concept_id` must reference " +
            "a concept inside the provided `kerf`.",
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
