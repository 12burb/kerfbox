import type Anthropic from "@anthropic-ai/sdk";
import { StrategyRequestSchema, KerfSchema, type SSEEvent, type Kerf } from "@/lib/schema";
import { extractByokKey, getAnthropic, hasAnthropicKey, STRATEGY_MODEL } from "@/lib/anthropic";
import { buildKerfMessages } from "@/lib/prompts";
import { DEMO_KERF } from "@/lib/demo";
import { authenticate, attemptedAuth, hasScope, logApiCall, sanitizeForLog, type AuthSubject } from "@/lib/api-auth";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { extractJsonObject } from "@/lib/json-extract";

export const runtime = "nodejs";
// Live web-search + Sonnet synthesis can occasionally exceed 60s on slow
// paths. 90s is the next clean cap that still fits within Vercel's
// fluid-compute window on every plan.
export const maxDuration = 90;

const SSE_HEADERS: HeadersInit = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

const DEMO_STEPS: Array<{ label: string; finding?: string }> = [
  { label: "Mapping the cluster", finding: "Top 5 PvP shooters all run gameplay-clip-heavy feeds — clear cluster" },
  { label: "Finding the kerf", finding: "Devs-in-the-public-queue is unoccupied and structurally hard for incumbents to follow" },
  { label: "Pressure-testing the wedge", finding: "Riot's cinematic-first lock-in makes 'devs lose to you' incredible for them — moat holds" },
  { label: "Reading platform trends", finding: "TikTok #BTS for gaming up 340% YoY; Twitch dev streams trending" },
  { label: "Cutting the kerf" },
];

function sseLine(event: SSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * Map an arbitrary thrown value to a caller-safe message. We allow a
 * handful of model-validation errors through verbatim because they help
 * UI debugging; anything else (including raw SDK errors that may carry
 * org/request IDs or partial prompts) collapses to a generic string.
 */
const SAFE_ERROR_PREFIXES = [
  "Model did not return valid JSON",
  "Model returned a malformed kerf",
  "Kerf rejected",
];
function sanitizeStreamError(err: unknown): string {
  if (err instanceof Error) {
    if (SAFE_ERROR_PREFIXES.some((p) => err.message.startsWith(p))) {
      return err.message;
    }
  }
  return "Inference failed. Please retry.";
}

/**
 * The brand POV expressed in code.
 *
 * A Kerf is only valid if its wedge.moat names at least one competitor
 * from cluster_map and gives a non-trivial structural reason. If the
 * moat is empty, generic, or doesn't reference a real competitor, we
 * refuse to ship — better an in-stream `error` event than undefendable
 * strategy. (The HTTP response is already 200 by the time we validate
 * because the SSE stream opened on the first byte; clients branch on
 * the SSE event `type`, not the status code.) The user sees exactly
 * why so they can re-run or pick a sharper input.
 *
 * Returns null on pass, or a refusal message on fail.
 */
function validateMoat(kerf: Kerf): string | null {
  const moat = kerf.wedge.moat.trim();
  if (moat.length < 80) {
    return "Kerf rejected: moat is too thin (under 80 chars). A defensible moat needs a structural reason — re-run with a sharper input.";
  }

  // Word-boundary, length-floored competitor match. `.includes()` was a
  // false-positive farm: a competitor named "AI" matched any moat
  // containing "main", "claim", or "fail." The moat now has to name a
  // 3+ char competitor as a discrete word (or word-prefix, since brand
  // names commonly take possessive 's, plural, etc.).
  const competitors = kerf.cluster_map
    .flatMap((c) => c.examples)
    .map((e) => e.trim())
    .filter((e) => e.length >= 3);
  const moatLower = moat.toLowerCase();
  const referencesCompetitor = competitors.some((name) => {
    const escaped = name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`, "i").test(moatLower);
  });
  if (!referencesCompetitor) {
    return "Kerf rejected: moat does not name a specific competitor from the cluster map. A moat is structural, not aspirational — re-run.";
  }

  // Reject the most common slop phrases that signal undifferentiated
  // moats. Cheap heuristic, but kills the worst output.
  const slopPhrases = [
    "we'll execute better",
    "we will execute better",
    "better execution",
    "do it better",
    "with more passion",
  ];
  if (slopPhrases.some((p) => moatLower.includes(p))) {
    return "Kerf rejected: moat reduces to 'we'll do it better,' which is not a moat. Re-run.";
  }

  return null;
}

async function runDemoStream(send: (e: SSEEvent) => void) {
  for (const step of DEMO_STEPS) {
    send({ type: "step", label: step.label, status: "running" });
    await new Promise((r) => setTimeout(r, 900));
    send({ type: "step", label: step.label, finding: step.finding, status: "done" });
  }
  send({ type: "kerf", kerf: DEMO_KERF });
}

async function runLiveStream(
  url: string,
  audience: string,
  byokKey: string | null,
  send: (e: SSEEvent) => void
) {
  const client = getAnthropic(byokKey);
  let currentLabel: string | null = null;

  const { system, user } = buildKerfMessages(url, audience);
  // System prompt is ~4KB of stable instructions — well past the 1024-token
  // floor that makes prompt caching pay off, and identical across every
  // strategy call. Pass it as a content-block array with `cache_control:
  // ephemeral` so Anthropic serves cached prefix tokens at ~10% of the
  // input cost for the next 5 minutes. Cache lookup is keyed on the full
  // prefix, so callers hitting the same instance back-to-back (the common
  // case: a user iterating on /app) get the discount automatically.
  const stream = client.messages.stream({
    model: STRATEGY_MODEL,
    // 8000 leaves headroom for: 7-day calendar × ~600 tokens, 3 concepts ×
    // ~250, cluster_map + wedge + signals with citations. 4000 was hitting
    // the cap occasionally on rich brands and clipping the last calendar
    // entries, which then failed KerfSchema's `.length(7)` check.
    max_tokens: 8000,
    system: [
      { type: "text", text: system, cache_control: { type: "ephemeral" } },
    ] as unknown as Anthropic.TextBlockParam[],
    tools: [
      { type: "web_search_20250305", name: "web_search" },
    ] as unknown as Anthropic.Tool[],
    messages: [{ role: "user", content: user }],
  });

  for await (const event of stream) {
    if (event.type === "content_block_start") {
      const block = (event as { content_block: { type: string; name?: string } }).content_block;
      if (block.type === "server_tool_use" && block.name === "web_search") {
        currentLabel = "Searching the web";
        send({ type: "step", label: currentLabel, status: "running" });
      } else if (block.type === "web_search_tool_result") {
        if (currentLabel) {
          send({ type: "step", label: currentLabel, status: "done" });
        }
        currentLabel = "Reading results";
        send({ type: "step", label: currentLabel, status: "running" });
      } else if (block.type === "text") {
        if (currentLabel) {
          send({ type: "step", label: currentLabel, status: "done" });
          currentLabel = null;
        }
        send({ type: "step", label: "Cutting the kerf", status: "running" });
        currentLabel = "Cutting the kerf";
      }
    }
  }

  const final = await stream.finalMessage();
  if (currentLabel) {
    send({ type: "step", label: currentLabel, status: "done" });
  }

  const textBlocks = final.content.filter(
    (b): b is Extract<typeof b, { type: "text" }> => b.type === "text"
  );
  const finalText = textBlocks[textBlocks.length - 1]?.text ?? "";
  const extracted = extractJsonObject(finalText);
  if (!extracted) {
    throw new Error("Model did not return valid JSON.");
  }

  let rawKerf: unknown;
  try {
    rawKerf = JSON.parse(extracted);
  } catch {
    throw new Error("Model did not return valid JSON.");
  }

  const validated = KerfSchema.safeParse(rawKerf);
  if (!validated.success) {
    throw new Error("Model returned a malformed kerf.");
  }

  const refusal = validateMoat(validated.data);
  if (refusal) {
    throw new Error(refusal);
  }

  send({ type: "kerf", kerf: validated.data });
}

/**
 * POST /api/strategy
 *
 * Cut a Kerf for {url, audience}. Streams Server-Sent Events.
 *
 * Auth: Clerk session OR `Authorization: Bearer cmo_live_...` (API key).
 * BYOK: optional `X-Anthropic-Key` header — when present, inference uses
 *       the caller's Anthropic key instead of ours (recommended for
 *       agents and high-volume API users).
 *
 * Body: { url: string, audience: string, demo?: boolean }
 *
 * The route refuses any output whose wedge.moat does not name a
 * competitor and give a structural reason. The refusal is the brand POV.
 */
export async function POST(req: Request) {
  const startedAt = Date.now();
  const subject: AuthSubject | null = await authenticate(req);
  const isApiKeyCall = subject?.via === "api_key";

  // If the caller passed a Bearer header but it didn't resolve, reject
  // unconditionally. Otherwise a garbage bearer would silently downgrade
  // to the anonymous demo path on instances without a server Anthropic key.
  if (subject === null && attemptedAuth(req)) {
    return jsonResponse(401, { error: "Invalid or expired API key." });
  }

  // For API-key callers, enforce a scope. Web sessions are implicitly trusted.
  if (isApiKeyCall && !hasScope(subject!, "strategy:write")) {
    return jsonResponse(403, { error: "API key missing required scope: strategy:write" });
  }

  // Rate-limit AFTER auth so we can key by user/api-key id (a logged-in
  // user gets the same budget across IPs). Anonymous callers are keyed
  // by IP. Budget: 10 strategy runs per hour — a Kerf is expensive on
  // both wall-clock and dollars, and a real user iterates 2-3 times.
  const rl = checkRateLimit(
    rateLimitKey({
      prefix: "strategy",
      userId: subject?.userId ?? null,
      apiKeyId: subject?.apiKeyId ?? null,
      req,
    }),
    10,
    60 * 60 * 1000
  );
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({ error: `Rate limit exceeded. Retry in ${rl.retryAfterSeconds}s.` }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(rl.retryAfterSeconds),
        },
      }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = StrategyRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(400, { error: "url and audience are required." });
  }
  const { url, audience } = parsed.data;
  const demoRequested = body && typeof body === "object" && body.demo === true;
  const byokKey = extractByokKey(req);
  const noKeyAvailable = !byokKey && !hasAnthropicKey();

  // API-key callers must NEVER silently get canned demo content when they
  // asked for live inference. If we can't run inference (no BYOK, no
  // server key), return 503 — an agent that ships demo content as the
  // real strategy is a much worse outcome than a clean error.
  if (isApiKeyCall && noKeyAvailable && !demoRequested) {
    return jsonResponse(503, {
      error:
        "Inference unavailable: no Anthropic key. Pass `X-Anthropic-Key` (BYOK) or contact support.",
    });
  }

  // Anonymous gating: demo OR BYOK is the on-ramp. If they asked for
  // live inference (no `demo: true`) without bringing a key, send them
  // back with a clear instruction. Anonymous + BYOK is allowed — they
  // pay Anthropic directly and we never hold the key.
  if (subject === null && !demoRequested && !byokKey) {
    return jsonResponse(401, {
      error:
        "Live inference requires either a BYOK Anthropic key (`X-Anthropic-Key` header) or authentication (`Authorization: Bearer cmo_live_...`). For demo content, set `demo: true`.",
    });
  }

  // Compute final mode AFTER the gate. `noKeyAvailable` already includes
  // !byokKey, so when BYOK is set we run live; when neither key exists,
  // signed-in callers fall back to demo (helpful in local dev). API-key
  // callers were rejected above (503), so they don't hit this path.
  const useDemo = demoRequested || noKeyAvailable;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: SSEEvent) => {
        controller.enqueue(encoder.encode(sseLine(event)));
      };
      try {
        if (useDemo) {
          await runDemoStream(send);
        } else {
          await runLiveStream(url, audience, byokKey, send);
        }
        await logApiCall({
          subject,
          endpoint: "/api/strategy",
          status: 200,
          durationMs: Date.now() - startedAt,
          byok: !!byokKey,
        });
      } catch (err) {
        // Sanitize: log the full error server-side (with secret scrubbing
        // so an `sk-ant-...` or `cmo_live_...` from the request never lands
        // in Vercel logs), ship a generic message to the client. SDK errors
        // can include org IDs, request IDs, and partial prompt text in
        // retry messages — none of which the caller needs.
        console.error("[/api/strategy] stream failed", sanitizeForLog(err));
        const message = sanitizeStreamError(err);
        send({ type: "error", message });
        await logApiCall({
          subject,
          endpoint: "/api/strategy",
          status: 500,
          durationMs: Date.now() - startedAt,
          byok: !!byokKey,
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
