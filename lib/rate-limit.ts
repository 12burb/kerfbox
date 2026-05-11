/**
 * Sliding-window rate limiter.
 *
 * Per-instance only — Vercel serverless cold-starts mean each function
 * container gets its own counters. A motivated abuser hammering across
 * many cold containers can defeat this; that's an acceptable v0.2
 * tradeoff while we run without a shared store. The bucket is here so
 * a single-instance hot path (the common case) is protected from
 * runaway load and a misbehaving agent doesn't burn $$$ in BYOK calls
 * the customer didn't authorize.
 *
 * To upgrade: swap `inMemoryLimiter` for an Upstash-backed implementation
 * keyed off env (UPSTASH_REDIS_REST_URL / _TOKEN). The `RateLimit`
 * interface stays the same — call sites won't change.
 */
export type RateLimitDecision = {
  allowed: boolean;
  retryAfterSeconds: number;
  /** Remaining tokens in the current window — useful for response headers. */
  remaining: number;
};

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

/**
 * Check whether `key` is under its budget for the window. Records the hit
 * if allowed. Returns the decision plus retry-after for the caller to
 * surface as a header.
 */
export function checkRateLimit(
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
