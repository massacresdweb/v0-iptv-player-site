import { Redis } from "@upstash/redis"

let redisClient: Redis | null = null

export function getRedisClient() {
  if (!redisClient) {
    const url = process.env.UPSTASH_KV_REST_API_URL || process.env.KV_REST_API_URL
    const token = process.env.UPSTASH_KV_REST_API_TOKEN || process.env.KV_REST_API_TOKEN

    if (!url || !token) {
      console.warn("[v0] Redis not configured, caching disabled")
      return {
        get: async () => null,
        set: async () => "OK",
        setex: async () => "OK",
        del: async () => 0,
        incr: async () => 1,
        expire: async () => 1,
        keys: async () => [],
      } as any
    }

    redisClient = new Redis({ url, token })
  }

  return redisClient
}

export const CACHE_KEYS = {
  ADMIN_SESSION: (token: string) => `admin:${token}`,
  USER_KEY: (keyCode: string) => `key:${keyCode}`,
  M3U_CHANNELS: (sourceId: number) => `m3u:${sourceId}:channels`,
  M3U_SOURCE: (sourceId: number) => `m3u:${sourceId}`,
  ACTIVE_SESSIONS: (keyCode: string) => `sessions:${keyCode}`,
  RATE_LIMIT: (identifier: string) => `rl:${identifier}`,
}

export const CACHE_TTL = {
  ADMIN_SESSION: 3600, // 1 hour
  USER_KEY: 1800, // 30 minutes
  M3U_CHANNELS: 3600, // 1 hour (aggressive caching)
  M3U_SOURCE: 1800, // 30 minutes
  RATE_LIMIT: 60, // 1 minute
}

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const client = getRedisClient()
    const data = await client.get(key)
    return data as T | null
  } catch (error) {
    console.error("[v0] Redis get error:", error)
    return null
  }
}

export async function setCached<T>(key: string, value: T, ttl: number): Promise<void> {
  try {
    const client = getRedisClient()
    await client.setex(key, ttl, JSON.stringify(value))
  } catch (error) {
    console.error("[v0] Redis set error:", error)
  }
}

export async function deleteCached(key: string): Promise<void> {
  try {
    const client = getRedisClient()
    await client.del(key)
  } catch (error) {
    console.error("[v0] Redis delete error:", error)
  }
}

export async function deletePattern(pattern: string): Promise<void> {
  try {
    const client = getRedisClient()
    const keys = await client.keys(pattern)
    if (keys.length > 0) {
      await client.del(...keys)
    }
  } catch (error) {
    console.error("[v0] Redis delete pattern error:", error)
  }
}

export async function checkRateLimit(
  identifier: string,
  limit: number,
  window: number,
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const client = getRedisClient()
    const key = CACHE_KEYS.RATE_LIMIT(identifier)

    const current = await client.incr(key)

    if (current === 1) {
      await client.expire(key, window)
    }

    const allowed = current <= limit
    const remaining = Math.max(0, limit - current)

    return { allowed, remaining }
  } catch (error) {
    console.error("[v0] Rate limit error:", error)
    return { allowed: true, remaining: limit }
  }
}

export { getCached as getCache, setCached as setCache }
