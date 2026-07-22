/**
 * Multi-provider BYOK registry + the OpenAI-compatible inference path.
 *
 * kerf.box is account-free: every live run happens on the CALLER's own
 * API key, passed per-request in headers and never stored. v0.2 only
 * accepted Anthropic keys (`X-Anthropic-Key`). v0.3 accepts any provider
 * through two inference paths:
 *
 *   1. "anthropic"          — the native SDK path (lib/anthropic.ts).
 *      Keeps the live web_search tool, so signals carry real citations.
 *   2. "openai-compatible"  — a raw-fetch call to `{baseUrl}/chat/completions`.
 *      Covers OpenAI, Gemini (OpenAI-compat endpoint), Kimi/Moonshot,
 *      Qwen/DashScope, DeepSeek, Groq, OpenRouter, Ollama, and any custom
 *      endpoint that speaks the chat-completions dialect. No web search:
 *      strategy runs on model knowledge and the output says so honestly
 *      (signals ship with empty citations — see lib/prompts.ts).
 *
 * Request headers (all optional, resolved by resolveByok):
 *   X-Provider       — a preset id below, e.g. "openai", "ollama", "custom".
 *   X-Api-Key        — the caller's key for that provider. Only honored
 *                      when X-Provider is present: a bare X-Api-Key is
 *                      rejected so a key pasted into the wrong tool can't
 *                      silently ride to an unintended upstream.
 *   X-Model          — override the preset's default model.
 *   X-Base-Url       — override the preset's base URL (required for
 *                      "custom"). Validated: https only, except loopback.
 *   X-Anthropic-Key  — legacy v0.2 header; still fully supported and
 *                      implies provider "anthropic".
 *
 * This module is imported by client components (the provider picker) —
 * keep it free of server-only imports (no @anthropic-ai/sdk, no next/*).
 */

export type ProviderKind = "anthropic" | "openai-compatible";

export type ProviderId =
  | "anthropic"
  | "openai"
  | "gemini"
  | "kimi"
  | "qwen"
  | "deepseek"
  | "groq"
  | "openrouter"
  | "ollama"
  | "custom";

export type ProviderPreset = {
  id: ProviderId;
  /** Human label for pickers and error messages. */
  label: string;
  kind: ProviderKind;
  /** Chat-completions base URL (no trailing slash). null = caller must supply X-Base-Url. */
  baseUrl: string | null;
  /**
   * Default model when the caller doesn't send X-Model. null = caller must
   * supply one (custom endpoints). These are editable in the UI — model
   * names rotate faster than we ship, so treat them as sane starting
   * points, not gospel.
   */
  defaultModel: string | null;
  /** Where a user creates a key. null when there's no key portal (custom). */
  keyUrl: string | null;
  /** Placeholder showing what the key looks like. */
  keyHint: string;
  /** true = endpoint works without a key (Ollama, LM Studio, custom proxies). */
  keyOptional?: boolean;
  /** One-line caveat surfaced in the UI. */
  note?: string;
};

/**
 * Preset order is the UI order: Anthropic first because it's the only
 * path with live web research, then the majors, then local/self-serve.
 */
export const PROVIDERS: Record<ProviderId, ProviderPreset> = {
  anthropic: {
    id: "anthropic",
    label: "Anthropic (Claude)",
    kind: "anthropic",
    baseUrl: null, // native SDK path — base URL not applicable
    defaultModel: null, // routes default per-task (strategy vs copy) via lib/anthropic.ts
    keyUrl: "https://console.anthropic.com/settings/keys",
    keyHint: "sk-ant-...",
    note: "The only provider with live web research — signals cite real pages.",
  },
  openai: {
    id: "openai",
    label: "OpenAI",
    kind: "openai-compatible",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-5.1",
    keyUrl: "https://platform.openai.com/api-keys",
    keyHint: "sk-...",
  },
  gemini: {
    id: "gemini",
    label: "Google Gemini",
    kind: "openai-compatible",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-2.5-flash",
    keyUrl: "https://aistudio.google.com/apikey",
    keyHint: "AIza...",
  },
  kimi: {
    id: "kimi",
    label: "Kimi (Moonshot AI)",
    kind: "openai-compatible",
    baseUrl: "https://api.moonshot.ai/v1",
    defaultModel: "kimi-latest",
    keyUrl: "https://platform.moonshot.ai/console/api-keys",
    keyHint: "sk-...",
  },
  qwen: {
    id: "qwen",
    label: "Qwen (Alibaba)",
    kind: "openai-compatible",
    baseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    defaultModel: "qwen-max",
    keyUrl: "https://modelstudio.console.alibabacloud.com/#/api-key",
    keyHint: "sk-...",
    note: "Uses the international DashScope endpoint. Mainland-China accounts: set base URL to https://dashscope.aliyuncs.com/compatible-mode/v1.",
  },
  deepseek: {
    id: "deepseek",
    label: "DeepSeek",
    kind: "openai-compatible",
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    keyUrl: "https://platform.deepseek.com/api_keys",
    keyHint: "sk-...",
  },
  groq: {
    id: "groq",
    label: "Groq",
    kind: "openai-compatible",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    keyUrl: "https://console.groq.com/keys",
    keyHint: "gsk_...",
  },
  openrouter: {
    id: "openrouter",
    label: "OpenRouter",
    kind: "openai-compatible",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "openrouter/auto",
    keyUrl: "https://openrouter.ai/settings/keys",
    keyHint: "sk-or-v1-...",
    note: "One key, any model — set X-Model / the model field to any OpenRouter model id.",
  },
  ollama: {
    id: "ollama",
    label: "Ollama (local)",
    kind: "openai-compatible",
    baseUrl: "http://localhost:11434/v1",
    defaultModel: "llama3.2",
    keyUrl: "https://ollama.com/download",
    keyHint: "no key needed",
    keyOptional: true,
    note: "Runs on YOUR machine — the hosted kerfbox.vercel.app cannot reach your localhost. Use Ollama with a self-hosted kerf.box (or a tunnel).",
  },
  custom: {
    id: "custom",
    label: "Custom endpoint",
    kind: "openai-compatible",
    baseUrl: null,
    defaultModel: null,
    keyUrl: null,
    keyHint: "key (if your endpoint needs one)",
    keyOptional: true,
    note: "Any OpenAI-compatible /chat/completions endpoint: LM Studio, vLLM, LiteLLM, a gateway, etc.",
  },
};

/** Preset list in display order, for pickers. */
export const PROVIDER_LIST: ProviderPreset[] = Object.values(PROVIDERS);

/* ---------------------------------------------------------------------- */
/* Header resolution                                                       */
/* ---------------------------------------------------------------------- */

// Anthropic shape kept strict (mirrors lib/anthropic.ts BYOK_SHAPE — not
// imported from there because that module pulls in the SDK, and this file
// must stay client-bundle-safe). Other providers get a loose printable-
// ASCII check: key formats vary too much to allowlist, but control chars,
// spaces, and megabyte strings are never a real key.
const ANTHROPIC_KEY_SHAPE = /^sk-ant-[A-Za-z0-9_-]{20,}$/;
const GENERIC_KEY_SHAPE = /^[!-~]{4,512}$/;
// Model ids across providers: letters/digits plus ./:_- and "/" (OpenRouter
// org/model, Fireworks paths) and ":" (tags like llama3.2:3b, :free).
const MODEL_SHAPE = /^[A-Za-z0-9._:\/-]{1,100}$/;

export type ByokConfig =
  | { kind: "anthropic"; apiKey: string; model: string | null }
  | {
      kind: "openai-compatible";
      providerId: ProviderId;
      baseUrl: string;
      apiKey: string | null;
      model: string;
    };

export type ByokResolution =
  | { ok: true; byok: ByokConfig | null } // null = no BYOK headers at all
  | { ok: false; error: string };

/**
 * Validate and normalize a caller-supplied base URL.
 *
 * SSRF hygiene for the hosted instance (this URL is fetched SERVER-side):
 *   • http(s) only, and http only for loopback (local Ollama / LM Studio
 *     on a self-host — on Vercel a loopback fetch just fails harmlessly).
 *   • private / link-local IP literals are rejected. A public hostname
 *     that resolves internally (DNS rebinding) is out of scope for a
 *     free BYOK relay — the response goes only back to the caller who
 *     supplied the URL, and the function runs in an isolated sandbox.
 *   • credentials-in-URL rejected; query/hash dropped.
 *
 * Normalizes away a trailing slash and a pasted "/chat/completions"
 * suffix — people copy full endpoint URLs from provider docs.
 */
export function validateBaseUrl(
  raw: string
): { ok: true; baseUrl: string } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, error: "Base URL is empty." };
  if (trimmed.length > 200) {
    return { ok: false, error: "Base URL is too long (max 200 chars)." };
  }
  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return { ok: false, error: "Base URL is not a valid URL." };
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") {
    return { ok: false, error: "Base URL must be http(s)." };
  }
  if (u.username || u.password) {
    return { ok: false, error: "Base URL must not embed credentials." };
  }
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const isLoopback =
    host === "localhost" || host === "::1" || /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host);
  if (u.protocol === "http:" && !isLoopback) {
    return { ok: false, error: "Base URL must use https (http is allowed only for localhost)." };
  }
  if (!isLoopback && isPrivateHost(host)) {
    return { ok: false, error: "Base URL points at a private network address." };
  }
  let base = u.origin + u.pathname;
  base = base.replace(/\/+$/, "").replace(/\/chat\/completions$/i, "").replace(/\/+$/, "");
  return { ok: true, baseUrl: base };
}

function isPrivateHost(host: string): boolean {
  // IPv4 literals in RFC1918 / link-local / "this network" ranges.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    const [a, b] = host.split(".").map(Number);
    if (a === 10 || a === 0) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 169 && b === 254) return true; // cloud metadata lives here
  }
  // IPv6 unique-local (fc00::/7) and link-local (fe80::/10).
  if (/^f[cd][0-9a-f]{2}:/i.test(host) || /^fe[89ab][0-9a-f]:/i.test(host)) return true;
  return false;
}

/**
 * Resolve the caller's BYOK configuration from request headers.
 *
 * Back-compat contract (v0.2 clients, including every published
 * kerfbox-mcp ≤0.2.0): a bare `X-Anthropic-Key` with no `X-Provider`
 * still resolves to the Anthropic path, and a malformed one still
 * resolves to `byok: null` (the route then 401s or serves demo) rather
 * than a hard error — exactly the old extractByokKey behavior.
 *
 * New contract: `X-Provider` makes everything explicit, and once it's
 * present we fail loudly on bad input (wrong key shape, missing base
 * URL) instead of silently degrading — the caller told us what they
 * meant, so a mismatch is an error they can fix.
 */
export function resolveByok(req: Request): ByokResolution {
  const provider = (req.headers.get("x-provider") ?? "").trim().toLowerCase();
  const apiKey = (req.headers.get("x-api-key") ?? "").trim();
  const model = (req.headers.get("x-model") ?? "").trim();
  const baseUrlHeader = (req.headers.get("x-base-url") ?? "").trim();
  const legacyKey = (req.headers.get("x-anthropic-key") ?? "").trim();

  if (model && !MODEL_SHAPE.test(model)) {
    return { ok: false, error: "X-Model contains invalid characters." };
  }

  if (!provider) {
    // No provider declared. Only the legacy Anthropic header is honored —
    // a bare X-Api-Key is ambiguous (whose key?) and gets a loud error
    // instead of a guess. This preserves v0.2's key-mix-up protection.
    if (apiKey) {
      return {
        ok: false,
        error:
          "X-Api-Key requires an X-Provider header (e.g. X-Provider: openai). " +
          "For Anthropic keys you can also use the X-Anthropic-Key header alone.",
      };
    }
    if (legacyKey && ANTHROPIC_KEY_SHAPE.test(legacyKey)) {
      return { ok: true, byok: { kind: "anthropic", apiKey: legacyKey, model: model || null } };
    }
    return { ok: true, byok: null };
  }

  const preset = PROVIDERS[provider as ProviderId];
  if (!preset) {
    return {
      ok: false,
      error: `Unknown X-Provider "${provider}". Valid: ${Object.keys(PROVIDERS).join(", ")}.`,
    };
  }

  if (preset.kind === "anthropic") {
    const key = apiKey || legacyKey;
    if (!key) {
      return {
        ok: false,
        error: "Provider anthropic requires a key in X-Api-Key (or X-Anthropic-Key).",
      };
    }
    if (!ANTHROPIC_KEY_SHAPE.test(key)) {
      return {
        ok: false,
        error: "That doesn't look like an Anthropic key (expected sk-ant-...).",
      };
    }
    return { ok: true, byok: { kind: "anthropic", apiKey: key, model: model || null } };
  }

  // OpenAI-compatible providers.
  if (apiKey && !GENERIC_KEY_SHAPE.test(apiKey)) {
    return { ok: false, error: "X-Api-Key contains invalid characters." };
  }
  if (!apiKey && !preset.keyOptional) {
    return {
      ok: false,
      error: `Provider ${preset.id} requires an API key in X-Api-Key. Get one: ${preset.keyUrl ?? "from your provider"}.`,
    };
  }

  let baseUrl = preset.baseUrl;
  if (baseUrlHeader) {
    const v = validateBaseUrl(baseUrlHeader);
    if (!v.ok) return { ok: false, error: `X-Base-Url: ${v.error}` };
    baseUrl = v.baseUrl;
  }
  if (!baseUrl) {
    return {
      ok: false,
      error: `Provider ${preset.id} requires X-Base-Url (an OpenAI-compatible /chat/completions endpoint).`,
    };
  }

  const resolvedModel = model || preset.defaultModel;
  if (!resolvedModel) {
    return { ok: false, error: `Provider ${preset.id} requires X-Model (a model id).` };
  }

  return {
    ok: true,
    byok: {
      kind: "openai-compatible",
      providerId: preset.id,
      baseUrl,
      apiKey: apiKey || null,
      model: resolvedModel,
    },
  };
}

/* ---------------------------------------------------------------------- */
/* OpenAI-compatible chat-completions client                               */
/* ---------------------------------------------------------------------- */

/**
 * Provider errors we surface to callers verbatim start with this prefix —
 * the strategy route's sanitizeStreamError allowlists it. Everything in
 * the message is either our own text, an HTTP status, or a scrubbed +
 * truncated provider `error.message` (which is what a user needs to see
 * to fix "model not found" or "invalid key" on THEIR provider account).
 */
export const PROVIDER_ERROR_PREFIX = "Provider error";

function providerError(status: number | null, detail: string, apiKey: string | null): Error {
  let msg = detail
    .replace(/[\r\n\t]+/g, " ")
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1f\x7f]/g, "")
    .slice(0, 200);
  // A provider echoing the key back in an error would otherwise transit
  // to the client and our logs. Never seen in practice; cheap to prevent.
  if (apiKey) msg = msg.split(apiKey).join("[REDACTED]");
  const statusPart = status === null ? "" : ` (HTTP ${status})`;
  return new Error(`${PROVIDER_ERROR_PREFIX}${statusPart}: ${msg}`);
}

/** Pull a human-useful message out of a provider error body. */
function extractErrorDetail(bodyText: string): string {
  try {
    const parsed: unknown = JSON.parse(bodyText);
    if (parsed && typeof parsed === "object") {
      const err = (parsed as { error?: unknown }).error;
      if (typeof err === "string") return err;
      if (err && typeof err === "object") {
        const m = (err as { message?: unknown }).message;
        if (typeof m === "string") return m;
      }
      const m = (parsed as { message?: unknown }).message;
      if (typeof m === "string") return m;
    }
  } catch {
    // Not JSON — fall through to raw text.
  }
  return bodyText || "no error detail from provider";
}

/**
 * One non-streaming chat completion against an OpenAI-compatible endpoint.
 * Returns the assistant message text (which the caller JSON-extracts —
 * same contract as the Anthropic path).
 *
 * No SDK, no streaming, no retries beyond one parameter-compat retry:
 * newer OpenAI models reject `max_tokens` in favor of
 * `max_completion_tokens`, while many compat servers only know the old
 * name — we send the old name first (widest support) and switch once if
 * the endpoint tells us to.
 */
export async function chatCompleteJson(opts: {
  baseUrl: string;
  apiKey: string | null;
  model: string;
  system: string;
  user: string;
  maxTokens: number;
  signal?: AbortSignal;
}): Promise<string> {
  const { baseUrl, apiKey, model, system, user, maxTokens, signal } = opts;
  const url = `${baseUrl}/chat/completions`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const messages = [
    { role: "system", content: system },
    { role: "user", content: user },
  ];

  const attempt = async (tokenParam: "max_tokens" | "max_completion_tokens") => {
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ model, messages, [tokenParam]: maxTokens }),
        signal,
      });
    } catch (err) {
      if (signal?.aborted) throw err; // caller disconnect — not a provider failure
      throw providerError(
        null,
        `could not reach ${baseUrl} — check the base URL (a localhost URL like Ollama's is only reachable from a self-hosted kerf.box, not the hosted app)`,
        apiKey
      );
    }
    return res;
  };

  let res = await attempt("max_tokens");
  if (res.status === 400) {
    const text = await res.text().catch(() => "");
    if (/max_tokens|max_completion_tokens/i.test(text)) {
      res = await attempt("max_completion_tokens");
    } else {
      throw providerError(400, extractErrorDetail(text), apiKey);
    }
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw providerError(res.status, extractErrorDetail(text), apiKey);
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw providerError(null, "endpoint returned non-JSON — is this a /chat/completions API?", apiKey);
  }

  // choices[0].message.content is a string on every real implementation,
  // but some gateways emit OpenAI's content-parts array — handle both.
  const choice =
    json && typeof json === "object"
      ? (json as { choices?: Array<{ message?: { content?: unknown } }> }).choices?.[0]
      : undefined;
  const content = choice?.message?.content;
  if (typeof content === "string" && content.length > 0) return content;
  if (Array.isArray(content)) {
    const text = content
      .map((p) => (p && typeof p === "object" && typeof (p as { text?: unknown }).text === "string" ? (p as { text: string }).text : ""))
      .join("");
    if (text) return text;
  }
  throw providerError(null, "endpoint returned an empty completion", apiKey);
}
