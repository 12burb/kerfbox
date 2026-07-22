import type Anthropic from "@anthropic-ai/sdk";
import { StrategyRequestSchema, KerfSchema, type SSEEvent, type Kerf } from "@/lib/schema";
import { getAnthropic, hasAnthropicKey, STRATEGY_MODEL } from "@/lib/anthropic";
import {
  resolveByok,
  chatCompleteJson,
  PROVIDERS,
  PROVIDER_ERROR_PREFIX,
  type ByokConfig,
} from "@/lib/providers";
import { buildKerfMessages } from "@/lib/prompts";
import { DEMO_KERF } from "@/lib/demo";
import { enforceBodyLimit, readJsonBodyWithLimit, sanitizeForLog } from "@/lib/api-auth";
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
  // Multi-provider BYOK: chatCompleteJson builds these messages itself
  // (status + scrubbed provider error.message) — the caller NEEDS them to
  // fix "model not found" / "invalid key" on their own provider account.
  PROVIDER_ERROR_PREFIX,
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

  // Boundary-anchored competitor match. `.includes()` was a false-positive
  // farm: a competitor named "AI" matched any moat containing "main",
  // "claim", or "fail." The rules below keep that fix while not silently
  // refusing legitimate mentions:
  //   • lookaround boundaries instead of \b — \b breaks on names that end
  //     in punctuation ("Yahoo!") and never matches CJK names at all
  //   • optional plural suffix — "Stripes" should still count as naming
  //     Stripe (possessive 's already sits past a boundary)
  //   • names with no ASCII word chars (CJK brands) fall back to substring
  //   • 2-char floor instead of 3 — boundaries already prevent the "AI in
  //     'maintain'" class of false positive, and an all-short list (EA, 2K)
  //     must not empty the pool
  const competitors = kerf.cluster_map
    .flatMap((c) => c.examples)
    .map((e) => e.trim().toLowerCase().replace(/[^\p{L}\p{N}]+$/u, ""))
    .filter((e) => e.length >= 2);
  const moatLower = moat.toLowerCase();
  const referencesCompetitor = competitors.some((name) => {
    if (!/\w/.test(name)) return moatLower.includes(name);
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?<!\\w)${escaped}(?:e?s)?(?!\\w)`, "i").test(moatLower);
  });
  // Fail open when the cluster map gave us nothing matchable (names that
  // collapse to <2 chars after trimming). Refusing on OUR matcher's blind
  // spot would reject every kerf for that input — the refusal rule is
  // about undefendable strategy, not tokenizer limitations.
  if (competitors.length > 0 && !referencesCompetitor) {
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

async function runDemoStream(send: (e: SSEEvent) => void, signal: AbortSignal) {
  for (const step of DEMO_STEPS) {
    if (signal.aborted) return;
    send({ type: "step", label: step.label, status: "running" });
    await new Promise((r) => setTimeout(r, 900));
    send({ type: "step", label: step.label, finding: step.finding, status: "done" });
  }
  send({ type: "kerf", kerf: DEMO_KERF });
}

/**
 * Shared tail of every live path: extract JSON from the model's text,
 * schema-validate, run the moat refusal rule. Throws only safe-prefixed
 * errors (see SAFE_ERROR_PREFIXES).
 */
function parseKerfFromText(finalText: string): Kerf {
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
  return validated.data;
}

async function runAnthropicStream(
  url: string,
  audience: string,
  byokKey: string | null,
  modelOverride: string | null,
  send: (e: SSEEvent) => void,
  signal: AbortSignal
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
  const stream = client.messages.stream(
    {
      model: modelOverride ?? STRATEGY_MODEL,
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
    },
    // Tied to the response stream's cancel(): when the client disconnects,
    // this aborts the Anthropic call instead of letting inference run to
    // completion against the caller's key (BYOK: abandoned run = their bill).
    { signal }
  );

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
  send({ type: "kerf", kerf: parseKerfFromText(finalText) });
}

/**
 * Live inference via any OpenAI-compatible provider (OpenAI, Gemini,
 * Kimi, Qwen, DeepSeek, Groq, OpenRouter, Ollama, custom endpoints).
 *
 * One non-streaming chat completion — these providers get no web_search
 * tool, so there are no research phases to narrate. The single step is
 * honest about that: the `finding` tells the caller this kerf runs on
 * model knowledge, and lib/prompts.ts (webSearch: false) forbids the
 * model from fabricating citations, so signals arrive with empty
 * citation lists instead of invented URLs.
 */
async function runOpenAICompatStream(
  url: string,
  audience: string,
  cfg: Extract<ByokConfig, { kind: "openai-compatible" }>,
  send: (e: SSEEvent) => void,
  signal: AbortSignal
) {
  const providerLabel = PROVIDERS[cfg.providerId].label;
  const label = `Cutting the kerf · ${cfg.model}`;
  send({ type: "step", label, status: "running" });

  const { system, user } = buildKerfMessages(url, audience, { webSearch: false });
  // 16000, not the Anthropic path's 8000: reasoning models (DeepSeek R1,
  // GPT-5.x, Qwen thinking modes) spend completion tokens thinking before
  // emitting the JSON, and on most compat APIs that budget comes out of
  // the same cap. Endpoints with smaller limits clamp rather than error.
  const text = await chatCompleteJson({
    baseUrl: cfg.baseUrl,
    apiKey: cfg.apiKey,
    model: cfg.model,
    system,
    user,
    maxTokens: 16000,
    signal,
  });

  send({
    type: "step",
    label,
    finding: `${providerLabel} runs without live web research — this kerf is cut from model knowledge. For signals with real citations, use an Anthropic key.`,
    status: "done",
  });
  send({ type: "kerf", kerf: parseKerfFromText(text) });
}

/**
 * POST /api/strategy
 *
 * Cut a Kerf for {url, audience}. Streams Server-Sent Events.
 *
 * Account-free: there is no login and no API key. Live inference runs on
 * the caller's OWN provider key (BYOK) — never stored, logged, or proxied.
 * Any provider: `X-Provider` + `X-Api-Key` (+ optional `X-Model`,
 * `X-Base-Url`), or the legacy `X-Anthropic-Key` alone for Anthropic.
 * Anthropic keys get live web research; OpenAI-compatible providers
 * (OpenAI, Gemini, Kimi, Qwen, DeepSeek, Groq, OpenRouter, Ollama,
 * custom) run on model knowledge. Without a key, pass `demo: true` for
 * canned content. A self-host operator may set a server
 * ANTHROPIC_API_KEY to run live for everyone hitting that instance.
 *
 * Rate limiting keys on client IP (see lib/rate-limit.ts).
 *
 * Body: { url: string, audience: string, demo?: boolean }
 *
 * The route refuses any output whose wedge.moat does not name a
 * competitor and give a structural reason. The refusal is the brand POV.
 */
export async function POST(req: Request) {
  // Reject oversized payloads before any parse/inference work.
  const tooLarge = enforceBodyLimit(req);
  if (tooLarge) return tooLarge;

  // Rate-limit by IP — there are no accounts or API keys to key on.
  // Budget: 10 strategy runs per hour — a Kerf is expensive on both
  // wall-clock and dollars, and a real user iterates 2-3 times.
  const rl = await checkRateLimit(
    rateLimitKey({ prefix: "strategy", req }),
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

  // Enforced (not just declared) byte cap — a chunked request with no
  // Content-Length gets counted off the wire here.
  const bodyRead = await readJsonBodyWithLimit(req);
  if (!bodyRead.ok) return bodyRead.response;
  const parsed = StrategyRequestSchema.safeParse(bodyRead.body);
  if (!parsed.success) {
    return jsonResponse(400, { error: "url and audience are required." });
  }
  const { url, audience } = parsed.data;
  const demoRequested = parsed.data.demo === true;

  // Resolve BYOK from headers (any provider). A malformed-but-explicit
  // config (bad base URL, wrong key shape under X-Provider) is a hard 401
  // with the reason — the caller told us what they meant, so a mismatch
  // is theirs to fix, not ours to silently demote to demo.
  const resolved = resolveByok(req);
  if (!resolved.ok) {
    return jsonResponse(401, { error: resolved.error });
  }
  const byok = resolved.byok;
  const noKeyAvailable = !byok && !hasAnthropicKey();

  // The on-ramp is demo OR a key. If the caller asked for live inference
  // (no `demo: true`) without bringing a BYOK key, and this instance has
  // no server key either, send them back with a clear instruction. BYOK
  // is always allowed — they pay their provider directly, we never hold it.
  if (!demoRequested && noKeyAvailable) {
    return jsonResponse(401, {
      error:
        "Live inference requires your own AI provider key (BYOK). Send `X-Provider` + `X-Api-Key` " +
        "(providers: anthropic, openai, gemini, kimi, qwen, deepseek, groq, openrouter, ollama, custom), " +
        "or an Anthropic key alone as `X-Anthropic-Key`. For canned content, set `demo: true`.",
    });
  }

  // Mode resolution. `noKeyAvailable` already includes !byok, so when
  // BYOK (or a self-host server key) is set we run live; otherwise demo.
  // kerf.box is free: live generation runs on the caller's own key (BYOK /
  // MCP) or the operator's server key on a self-host — we never charge.
  const useDemo = demoRequested || noKeyAvailable;

  const encoder = new TextEncoder();
  // Fires when the client walks away (tab closed, reset, watchdog abort).
  // Without it, inference runs to completion against the caller's key —
  // on BYOK an abandoned run is still their Anthropic bill.
  const disconnect = new AbortController();
  let closed = false;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: SSEEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(sseLine(event)));
        } catch {
          // Canceled between the flag check and the enqueue — treat as
          // closed; the disconnect signal is already aborting the work.
          closed = true;
        }
      };
      try {
        if (useDemo) {
          await runDemoStream(send, disconnect.signal);
        } else if (byok?.kind === "openai-compatible") {
          await runOpenAICompatStream(url, audience, byok, send, disconnect.signal);
        } else {
          // Anthropic path: BYOK key (with optional model override) or the
          // self-host server key when byok is null.
          await runAnthropicStream(
            url,
            audience,
            byok?.apiKey ?? null,
            byok?.model ?? null,
            send,
            disconnect.signal
          );
        }
      } catch (err) {
        // A disconnect abort is not an error — nobody is listening.
        if (!disconnect.signal.aborted) {
          // Sanitize: log the full error server-side (with secret scrubbing
          // so an `sk-ant-...` from the request never lands in Vercel logs),
          // ship a generic message to the client. SDK errors can include org
          // IDs, request IDs, and partial prompt text in retry messages —
          // none of which the caller needs.
          console.error("[/api/strategy] stream failed", sanitizeForLog(err));
          send({ type: "error", message: sanitizeStreamError(err) });
        }
      } finally {
        if (!closed) {
          closed = true;
          try {
            controller.close();
          } catch {
            // Already canceled by the client — nothing to close.
          }
        }
      }
    },
    cancel() {
      closed = true;
      disconnect.abort();
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
