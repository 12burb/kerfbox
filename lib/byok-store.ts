import { PROVIDERS, type ProviderId } from "./providers";

/**
 * Browser-side BYOK settings: which provider is active, plus the key /
 * model / base-URL the user entered PER provider — switching from OpenAI
 * to Groq and back must not eat the OpenAI key.
 *
 * Security model (unchanged from v0.2, now multi-provider): everything
 * here lives exclusively in this browser's per-origin localStorage. Keys
 * ride to our API only as transient request headers so the server can
 * call the provider on that one request — never stored, logged, or
 * proxied server-side. Clearing a field removes it from the browser
 * immediately; there is nothing on our side to leak.
 */
export type ByokSettings = {
  provider: ProviderId;
  keys: Partial<Record<ProviderId, string>>;
  models: Partial<Record<ProviderId, string>>;
  baseUrls: Partial<Record<ProviderId, string>>;
};

const STORE_KEY = "kerfbox.byok.v1";
// v0.2 stored a single Anthropic key here. Still read (migration) and
// still written when the Anthropic key changes, so an old tab or a
// rolled-back deploy keeps working against the same browser.
const LEGACY_KEY = "kerfbox.byokKey";

export function defaultByokSettings(): ByokSettings {
  return { provider: "anthropic", keys: {}, models: {}, baseUrls: {} };
}

function sanitizeRecord(v: unknown): Partial<Record<ProviderId, string>> {
  const out: Partial<Record<ProviderId, string>> = {};
  if (v && typeof v === "object") {
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (PROVIDERS[k as ProviderId] && typeof val === "string" && val.trim()) {
        out[k as ProviderId] = val.trim();
      }
    }
  }
  return out;
}

/** Load settings from localStorage. Never throws; falls back to defaults. */
export function loadByokSettings(): ByokSettings {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        const p = parsed as Record<string, unknown>;
        const provider =
          typeof p.provider === "string" && PROVIDERS[p.provider as ProviderId]
            ? (p.provider as ProviderId)
            : "anthropic";
        return {
          provider,
          keys: sanitizeRecord(p.keys),
          models: sanitizeRecord(p.models),
          baseUrls: sanitizeRecord(p.baseUrls),
        };
      }
    }
    const legacy = window.localStorage.getItem(LEGACY_KEY);
    if (legacy && legacy.trim()) {
      const s = defaultByokSettings();
      s.keys.anthropic = legacy.trim();
      return s;
    }
  } catch {
    // Restrictive privacy modes — run without persistence.
  }
  return defaultByokSettings();
}

/** Persist settings. Never throws. */
export function saveByokSettings(s: ByokSettings): void {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(s));
    const anthropicKey = (s.keys.anthropic ?? "").trim();
    if (anthropicKey) window.localStorage.setItem(LEGACY_KEY, anthropicKey);
    else window.localStorage.removeItem(LEGACY_KEY);
  } catch {
    // Ignore — the app works without persistence.
  }
}

/** The key entered for the currently active provider ("" if none). */
export function activeKey(s: ByokSettings): string {
  return (s.keys[s.provider] ?? "").trim();
}

/** The effective base URL for the active provider (user override or preset). */
export function activeBaseUrl(s: ByokSettings): string {
  return (s.baseUrls[s.provider] ?? "").trim() || (PROVIDERS[s.provider].baseUrl ?? "");
}

/**
 * True when the active provider has enough config for a live run:
 * a key for keyed providers; for keyless-capable ones (Ollama, custom)
 * a base URL is the real requirement.
 */
export function canRunLive(s: ByokSettings): boolean {
  const preset = PROVIDERS[s.provider];
  const key = activeKey(s);
  if (preset.kind === "anthropic") return key.length > 0;
  if (!activeBaseUrl(s)) return false;
  return key.length > 0 || Boolean(preset.keyOptional);
}

/**
 * Build the BYOK request headers for /api/strategy and /api/copy.
 * Returns {} when the active provider isn't runnable — callers use that
 * to fall back to `demo: true`.
 */
export function buildByokHeaders(s: ByokSettings): Record<string, string> {
  if (!canRunLive(s)) return {};
  const preset = PROVIDERS[s.provider];
  const headers: Record<string, string> = { "X-Provider": preset.id };
  const key = activeKey(s);
  const model = (s.models[s.provider] ?? "").trim();
  if (model) headers["X-Model"] = model;

  if (preset.kind === "anthropic") {
    // Legacy header kept alongside X-Provider so a rolled-back server
    // build (which only knows X-Anthropic-Key) still authorizes.
    headers["X-Anthropic-Key"] = key;
    headers["X-Api-Key"] = key;
    return headers;
  }

  if (key) headers["X-Api-Key"] = key;
  const override = (s.baseUrls[s.provider] ?? "").trim();
  // Send the base URL only when it differs from the preset — the server
  // knows its own presets, and "custom" has no preset so it always sends.
  if (override && override !== (preset.baseUrl ?? "")) headers["X-Base-Url"] = override;
  return headers;
}
