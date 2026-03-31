import type { Context, Next } from "hono";
import { redis } from "../lib/redis";

interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyPrefix: string;
}

export function rateLimit(opts: RateLimitOptions) {
  return async (c: Context, next: Next) => {
    const ip = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
    const key = `rl:${opts.keyPrefix}:${ip}`;

    try {
      const current = await redis.incr(key);
      if (current === 1) {
        await redis.pexpire(key, opts.windowMs);
      }

      c.header("X-RateLimit-Limit", opts.max.toString());
      c.header("X-RateLimit-Remaining", Math.max(0, opts.max - current).toString());

      if (current > opts.max) {
        return c.json({ error: "Too many requests" }, 429);
      }
    } catch {
      // Redis down — allow request through
    }

    await next();
  };
}

// Presets
export const analyticsRateLimit = rateLimit({
  windowMs: 60_000,
  max: 120,
  keyPrefix: "analytics",
});

export const apiRateLimit = rateLimit({
  windowMs: 60_000,
  max: 60,
  keyPrefix: "api",
});

export const playerConfigRateLimit = rateLimit({
  windowMs: 60_000,
  max: 300,
  keyPrefix: "player",
});
