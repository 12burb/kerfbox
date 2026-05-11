/**
 * Sliding-window rate limiter with two backends:
 *
 *   1. In-memory bucket map (default). Per-instance only — Vercel cold
 *      starts mean each container has its own counters, so a motivated
 *      attacker can defeat this by spraying across cold containers. Cheap
 *      and works zero-config; right for early environments and local dev.
 *
 *   2. Upstash REST (preferred, autodetected). Activates when either
 *      UPSTASH_REDIS_REST_URL+UPSTASH_REDIS_REST_TOKEN or Vercel KV's
 *      KV_REST_API_URL+KV_REST_API_TOKEN are present. Uses a per-key ZSET
 *      with sliding-window semantics over Upstash's `/pipeline` endpoint
 *      — one HTTP roundtrip per check. If the request fails or times out
 *      we fall back to the in-memory check; fail-open with degraded
 *      protection beats taking the API down on a limiter hiccup.
 *
 * The API is async to accommodate the network call. Call sites do
 * `await checkRateLimit(...)`. When no Upstash env is set the awaited
 * promise resolves synchronously off the in-memory path — no overhead.
 */
export type RateLimitDecision = {
  allowed: boolean;
  retryAfterSeconds: number;
  /** Remaining tokens in the current window — useful for response headers. */
  remaining: number;
};

// ---- in-memory backend -----------------------------------------------------

type Bucket = {
  /** Timestamps (ms) of recent hits, oldest first. */
  hits: number[];
};

const BUCKETS = new Map<string, Bucket>();

/** Hard cap on tracked keys to prevent unbounded growth from spray attacks. */
const MAX_BUCKETS = 10_000;

/**
 * Sweep stale buckets when we cross the cap. Cheap O(n) — the cap is small
 * by design. Called from `check()` rather than on a timer (no lifecycle
 * to hook on Vercel functions; rely on traffic to drive cleanup).
 */
function evictIfNeeded(now: number, windowMs: number) {
  if (BUCKETS.size < MAX_BUCKETS) return;
  for (const [k, bucket] of BUCKETS) {
    if (bucket.hits.length === 0 || bucket.hits[bucket.hits.length - 1] < now - windowMs) {
      BUCKETS.delete(k);
    }
  }
}

function inMemoryCheck(
  key: string,
  limit: number,
  windowMs: number
): RateLimitDecision {
  const now = Date.now();
  evictIfNeeded(now, windowMs);
  const bucket = BUCKETS.get(key) ?? { hits: [] };
  // Drop hits that fell out of the window. Doing this here keeps the
  // hits array size bounded to `limit` per active key.
  bucket.hits = bucket.hits.filter((t) => t > now - windowMs);

  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    BUCKETS.set(key, bucket);
    return { allowed: false, retryAfterSeconds, remaining: 0 };
  }

  bucket.hits.push(now);
  BUCKETS.set(key, bucket);
  return { allowed: true, retryAfterSeconds: 0, remaining: limit - bucket.hits.length };
}

// ---- Upstash REST backend --------------------------------------------------

type UpstashCfg = { url: string; token: string };

function readUpstashConfig(): UpstashCfg | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL ||
    "";
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    "";
  if (!url || !token) return null;
  // Strip trailing slash so we can compose `${url}/pipeline` without
  // double-slashing the path. Upstash tolerates it; we don't want to
  // depend on that.
  return { url: url.replace(/\/+$/, ""), token };
}

/** Cached so repeated checks don't re-walk process.env per call. */
let UPSTASH_CFG: UpstashCfg | null | undefined;
function upstashConfig(): UpstashCfg | null {
  if (UPSTASH_CFG !== undefined) return UPSTASH_CFG;
  UPSTASH_CFG = readUpstashConfig();
  return UPSTASH_CFG;
}

/**
 * Cap the limiter's latency budget. If Upstash is degraded, we'd rather
 * fall back to in-memory than make every request hang. 1.5s is well above
 * normal Upstash REST latency (sub-50ms in-region) and still snappy enough
 * that aborting won't add visible UX delay.
 */
const UPSTASH_TIMEOUT_MS = 1500;

type PipelineEntry = { result?: unknown; error?: string };

async function upstashCheck(
  cfg: UpstashCfg,
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitDecision> {
  const now = Date.now();
  // Unique member so two hits with identical millisecond timestamps don't
  // collapse into one ZSET entry.
  const member = `${now}-${Math.random().toString(36).slice(2, 10)}`;
  const ttlSeconds = Math.max(1, Math.ceil(windowMs / 1000));

  // Pipeline (single roundtrip):
  //   1. Drop expired entries (anything older than the window).
  //   2. ZADD this hit.
  //   3. ZCARD for the count after the add.
  //   4. ZRANGE 0 0 WITHSCORES to read the oldest entry's score
  //      (so we can compute Retry-After on denial).
  //   5. EXPIRE to keep the key bounded; otherwise inactive keys would
  //      stick around forever on the cluster.
  const body = JSON.stringify([
    ["ZREMRANGEBYSCORE", key, 0, now - windowMs],
    ["ZADD", key, now, member],
    ["ZCARD", key],
    ["ZRANGE", key, 0, 0, "WITHSCORES"],
    ["EXPIRE", key, ttlSeconds],
  ]);

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), UPSTASH_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${cfg.url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        "Content-Type": "application/json",
      },
      body,
      signal: controller.signal,
      // No-store because this is hot-path state, not cacheable.
      cache: "no-store",
    });
  } finally {
    clearTimeout(timeoutHandle);
  }
  if (!res.ok) throw new Error(`upstash ${res.status}`);

  const payload = (await res.json()) as PipelineEntry[];
  if (!Array.isArray(payload) || payload.length < 5) {
    throw new Error("upstash: unexpected pipeline shape");
  }
  const card = Number(payload[2]?.result ?? 0);
  const rangeResult = payload[3]?.result;
  // ZRANGE WITHSCORES returns [member, score] pairs flattened. We asked
  // for one entry, so the array length is 2 (or 0 if the key is empty).
  let oldestScore = now;
  if (Array.isArray(rangeResult) && rangeResult.length >= 2) {
    const score = Number(rangeResult[1]);
    if (Number.isFinite(score)) oldestScore = score;
  }

  if (card > limit) {
    // We already added our hit above — roll it back so the queue length
    // matches the semantics of the in-memory limiter (denied hits don't
    // accumulate). Fire-and-forget; failures are fine because the entry
    // will TTL out regardless.
    void fetch(
      `${cfg.url}/zrem/${encodeURIComponent(key)}/${encodeURIComponent(member)}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${cfg.token}` },
        cache: "no-store",
      }
    ).catch(() => {});
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((oldestScore + windowMs - now) / 1000)
    );
    return { allowed: false, retryAfterSeconds, remaining: 0 };
  }

  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: Math.max(0, limit - card),
  };
}

// ---- public API ------------------------------------------------------------

/**
 * Check whether `key` is under its budget for the window. Records the hit
 * if allowed. Returns the decision plus retry-after for the caller to
 * surface as a header.
 *
 * Async because the Upstash backend is HTTP. Resolves synchronously when
 * Upstash env is unset (in-memory path).
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitDecision> {
  const cfg = upstashConfig();
  if (!cfg) return inMemoryCheck(key, limit, windowMs);
  try {
    return await upstashCheck(cfg, key, limit, windowMs);
  } catch (err) {
    // Fail-open with the in-memory backend. We still get *some* protection
    // even if Upstash is unreachable, and we avoid taking down the API
    // when our limiter dependency hiccups.
    // eslint-disable-next-line no-console
    console.warn("[rate-limit] upstash failed, falling back to in-memory:", err);
    return inMemoryCheck(key, limit, windowMs);
  }
}

/**
 * Build a stable rate-limit key for a request. Order of preference:
 *   1. Authenticated user id (so signed-in users share a budget across
 *      devices/sessions, and an attacker can't bypass by rotating cookies)
 *   2. API key id (per-credential budget)
 *   3. Forwarded client IP from the standard Vercel headers
 *   4. Fallback marker — coarse but never empty
 */
export function rateLimitKey(args: {
  prefix: string;
  userId?: string | null;
  apiKeyId?: string | null;
  req: Request;
}): string {
  if (args.userId) return `${args.prefix}:user:${args.userId}`;
  if (args.apiKeyId) return `${args.prefix}:key:${args.apiKeyId}`;
  const ip =
    args.req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    args.req.headers.get("x-real-ip") ||
    "anon";
  return `${args.prefix}:ip:${ip}`;
}
