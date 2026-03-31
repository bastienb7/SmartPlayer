import Redis from "ioredis";
import { env } from "../config/env";

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on("error", (err) => {
  console.error("[Redis] Connection error:", err.message);
});

// Cache helpers
export async function cacheGet<T>(key: string): Promise<T | null> {
  const val = await redis.get(key);
  if (!val) return null;
  return JSON.parse(val) as T;
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
}

export async function cacheDel(key: string): Promise<void> {
  await redis.del(key);
}
