/**
 * Sliding-window rate limit — 02 §11: 10 analyses/day/IP. Values keyed by
 * plan (anon only today — 00 §monetization). Upstash REST when configured;
 * per-process in-memory fallback otherwise (fine for single-instance dev;
 * see DECISIONS.md).
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

const PLAN_LIMITS: Record<string, { limit: number; windowMs: number }> = {
  anon: { limit: 10, windowMs: 24 * 60 * 60 * 1000 },
};

const memory = new Map<string, number[]>();

async function upstashSlidingWindow(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const now = Date.now();
  const windowStart = now - windowMs;
  try {
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify([
        ["ZREMRANGEBYSCORE", key, "0", String(windowStart)],
        ["ZCARD", key],
        ["ZADD", key, String(now), `${now}-${Math.random().toString(36).slice(2)}`],
        ["PEXPIRE", key, String(windowMs)],
      ]),
    });
    if (!res.ok) return null;
    const results = (await res.json()) as { result: number }[];
    const count = results[1]?.result ?? 0;
    if (count >= limit) {
      // over limit — undo the optimistic ZADD
      await fetch(`${url}/ZREMRANGEBYRANK/${key}/-1/-1`, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => undefined);
      return { allowed: false, remaining: 0, resetMs: windowMs };
    }
    return { allowed: true, remaining: limit - count - 1, resetMs: windowMs };
  } catch {
    return null; // Redis down → fail open to memory
  }
}

function memorySlidingWindow(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const hits = (memory.get(key) ?? []).filter((t) => t > now - windowMs);
  if (hits.length >= limit) {
    memory.set(key, hits);
    const oldest = hits[0] ?? now;
    return { allowed: false, remaining: 0, resetMs: oldest + windowMs - now };
  }
  hits.push(now);
  memory.set(key, hits);
  return { allowed: true, remaining: limit - hits.length, resetMs: windowMs };
}

export async function checkRateLimit(
  ip: string,
  plan = "anon",
): Promise<RateLimitResult> {
  const { limit, windowMs } = PLAN_LIMITS[plan] ?? PLAN_LIMITS.anon!;
  const key = `rl:analyze:${plan}:${ip}`;
  const upstash = await upstashSlidingWindow(key, limit, windowMs);
  return upstash ?? memorySlidingWindow(key, limit, windowMs);
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() ?? "local";
}
