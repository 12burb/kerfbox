import type Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { CopyRequestSchema, CopySchema } from "@/lib/schema";
import { extractByokKey, getAnthropic, hasAnthropicKey, COPY_MODEL } from "@/lib/anthropic";
import { buildCopyMessages } from "@/lib/prompts";
import { DEMO_COPY } from "@/lib/demo";
import { authenticate, attemptedAuth, hasScope, logApiCall, sanitizeForLog } from "@/lib/api-auth";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Pull the first balanced JSON object out of a model response. See
 * `/api/strategy/route.ts` for full rationale — same scanner.
 */
function extractJsonObject(s: string): string | null {
  const stripped = s.replace(/```json\s*|\s*```/g, "");
  let depth = 0;
  let start = -1;
  let inStr = false;
  let escape = false;
  for (let i = 0; i < stripped.length; i++) {
    const ch = stripped[i];
    if (inStr) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') {
      inStr = true;
      continue;
    }
    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        return stripped.slice(start, i + 1);
      }
    }
  }
  return null;
}

/**
 * POST /api/copy
 *
 * Generate platform-ready copy for one calendar entry.
 *
 * Auth: Clerk session OR `Authorization: Bearer cmo_live_...`
 * BYOK: optional `X-Anthropic-Key` header.
 *
 * Body: { kerf: Kerf, entry: CalendarEntry, demo?: boolean }
 */
export async function POST(req: Request) {
  const startedAt = Date.now();
  const subject = await authenticate(req);
  const isApiKeyCall = subject?.via === "api_key";

  // Bearer attempted but didn't resolve → 401, never fall through to demo.
  if (subject === null && attemptedAuth(req)) {
    return NextResponse.json(
      { error: "Invalid or expired API key." },
      { status: 401 }
    );
  }

  if (isApiKeyCall && !hasScope(subject!, "copy:write")) {
    return NextResponse.json(
      { error: "API key missing required scope: copy:write" },
      { status: 403 }
    );
  }

  // Copy is cheaper per-call than strategy but a typical session
  // generates 7 (one per calendar entry). Budget: 60 / hour — covers
  // 8 full calendars in an hour with headroom for retries.
  const rl = checkRateLimit(
    rateLimitKey({
      prefix: "copy",
      userId: subject?.userId ?? null,
      apiKeyId: subject?.apiKeyId ?? null,
      req,
    }),
    60,
    60 * 60 * 1000
  );
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Retry in ${rl.retryAfterSeconds}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = CopyRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "kerf and entry are required." }, { status: 400 });
  }
  const { kerf, entry } = parsed.data;
  const demoRequested = body && typeof body === "object" && body.demo === true;
  const byokKey = extractByokKey(req);
  const noKeyAvailable = !byokKey && !hasAnthropicKey();

  // API-key callers must NEVER silently get canned demo content when they
  // asked for live inference. See /api/strategy for full rationale.
  if (isApiKeyCall && noKeyAvailable && !demoRequested) {
    return NextResponse.json(
      {
        error:
          "Inference unavailable: no Anthropic key. Pass `X-Anthropic-Key` (BYOK) or contact support.",
      },
      { status: 503 }
    );
  }

  // Anonymous gating: demo OR BYOK. See /api/strategy for full rationale.
  if (subject === null && !demoRequested && !byokKey) {
    return NextResponse.json(
      {
        error:
          "Live inference requires either a BYOK Anthropic key (`X-Anthropic-Key` header) or authentication (`Authorization: Bearer cmo_live_...`). For demo content, set `demo: true`.",
      },
      { status: 401 }
    );
  }

  const useDemo = demoRequested || noKeyAvailable;

  if (useDemo) {
    await new Promise((r) => setTimeout(r, 700));
    void logApiCall({
      subject,
      endpoint: "/api/copy",
      status: 200,
      durationMs: Date.now() - startedAt,
      byok: false,
    });
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
      void logApiCall({
        subject,
        endpoint: "/api/copy",
        status: 502,
        durationMs: Date.now() - startedAt,
        byok: !!byokKey,
      });
      return NextResponse.json({ error: "Model did not return valid JSON." }, { status: 502 });
    }

    const validated = CopySchema.safeParse(rawCopy);
    if (!validated.success) {
      void logApiCall({
        subject,
        endpoint: "/api/copy",
        status: 502,
        durationMs: Date.now() - startedAt,
        byok: !!byokKey,
      });
      return NextResponse.json({ error: "Model returned malformed copy." }, { status: 502 });
    }

    void logApiCall({
      subject,
      endpoint: "/api/copy",
      status: 200,
      durationMs: Date.now() - startedAt,
      byok: !!byokKey,
    });
    return NextResponse.json({ copy: validated.data });
  } catch (err) {
    // Log the full error server-side (with secret scrubbing) and return
    // a generic message. SDK error strings can include org IDs, request
    // IDs, partial prompt fragments — none of which clients need.
    console.error("[/api/copy] failed", sanitizeForLog(err));
    void logApiCall({
      subject,
      endpoint: "/api/copy",
      status: 500,
      durationMs: Date.now() - startedAt,
      byok: !!byokKey,
    });
    return NextResponse.json(
      { error: "Inference failed. Please retry." },
      { status: 500 }
    );
  }
}
