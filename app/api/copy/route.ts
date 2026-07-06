import type Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { CopyRequestSchema, CopySchema } from "@/lib/schema";
import { extractByokKey, getAnthropic, hasAnthropicKey, COPY_MODEL } from "@/lib/anthropic";
import { buildCopyMessages } from "@/lib/prompts";
import { DEMO_COPY } from "@/lib/demo";
import { enforceBodyLimit, readJsonBodyWithLimit, sanitizeForLog } from "@/lib/api-auth";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { extractJsonObject } from "@/lib/json-extract";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/copy
 *
 * Generate platform-ready copy for one calendar entry.
 *
 * Account-free: no login, no API key. Live inference runs on the caller's
 * own Anthropic key via the `X-Anthropic-Key` header (BYOK) — never stored
 * or logged. Without a key, pass `demo: true`. Self-host operators may set
 * a server ANTHROPIC_API_KEY. Rate limiting keys on client IP.
 *
 * Body: { kerf: Kerf, entry: CalendarEntry, demo?: boolean }
 */
export async function POST(req: Request) {
  const tooLarge = enforceBodyLimit(req);
  if (tooLarge) return tooLarge;

  // Rate-limit by IP — no accounts or API keys to key on. Copy is cheaper
  // per-call than strategy but a typical session generates 7 (one per
  // calendar entry). Budget: 60 / hour — covers 8 full calendars with
  // headroom for retries.
  const rl = await checkRateLimit(
    rateLimitKey({ prefix: "copy", req }),
    60,
    60 * 60 * 1000
  );
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Retry in ${rl.retryAfterSeconds}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    );
  }

  // Enforced (not just declared) byte cap — a chunked request with no
  // Content-Length gets counted off the wire here.
  const bodyRead = await readJsonBodyWithLimit(req);
  if (!bodyRead.ok) return bodyRead.response;
  const parsed = CopyRequestSchema.safeParse(bodyRead.body);
  if (!parsed.success) {
    return NextResponse.json({ error: "kerf and entry are required." }, { status: 400 });
  }
  const { kerf, entry } = parsed.data;
  // The entry must belong to the kerf it rides in with (the OpenAPI spec
  // says "one of kerf.calendar's entries"). Copy quality depends on the
  // wedge/concept context resolving — a foreign entry would silently
  // degrade output instead of failing loudly.
  if (!kerf.concepts.some((c) => c.id === entry.concept_id)) {
    return NextResponse.json(
      { error: "entry.concept_id does not match any concept in kerf." },
      { status: 400 }
    );
  }
  const demoRequested = parsed.data.demo === true;
  const byokKey = extractByokKey(req);
  const noKeyAvailable = !byokKey && !hasAnthropicKey();

  // On-ramp is demo OR a key. If the caller asked for live copy without a
  // BYOK key and this instance has no server key, return a clear 401.
  if (!demoRequested && noKeyAvailable) {
    return NextResponse.json(
      {
        error:
          "Live inference requires your own Anthropic key (`X-Anthropic-Key` header, BYOK) or a Claude MCP connection. For canned content, set `demo: true`.",
      },
      { status: 401 }
    );
  }

  const useDemo = demoRequested || noKeyAvailable;

  if (useDemo) {
    await new Promise((r) => setTimeout(r, 700));
    return NextResponse.json({ copy: DEMO_COPY });
  }

  try {
    const client = getAnthropic(byokKey);
    const { system, user } = buildCopyMessages(entry, kerf);
    // System prompt is stable across the ~7 calls a session makes
    // (one per calendar entry). Cache it so we only pay full-rate
    // input cost on the first call within the 5-minute TTL — Haiku
    // is already cheap, but the prompt-caching discount stacks and
    // the cache lookup is free.
    const response = await client.messages.create({
      model: COPY_MODEL,
      max_tokens: 1500,
      system: [
        { type: "text", text: system, cache_control: { type: "ephemeral" } },
      ] as unknown as Anthropic.TextBlockParam[],
      messages: [{ role: "user", content: user }],
    });

    const text = response.content
      .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
      .map((b) => b.text)
      .join("");
    const extracted = extractJsonObject(text);

    let rawCopy: unknown;
    try {
      if (!extracted) throw new Error("no balanced json");
      rawCopy = JSON.parse(extracted);
    } catch {
      return NextResponse.json({ error: "Model did not return valid JSON." }, { status: 502 });
    }

    const validated = CopySchema.safeParse(rawCopy);
    if (!validated.success) {
      return NextResponse.json({ error: "Model returned malformed copy." }, { status: 502 });
    }

    return NextResponse.json({ copy: validated.data });
  } catch (err) {
    // Log the full error server-side (with secret scrubbing) and return
    // a generic message. SDK error strings can include org IDs, request
    // IDs, partial prompt fragments — none of which clients need.
    console.error("[/api/copy] failed", sanitizeForLog(err));
    return NextResponse.json(
      { error: "Inference failed. Please retry." },
      { status: 500 }
    );
  }
}
