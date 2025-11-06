import { createClient } from "redis"

let redisClient: ReturnType<typeof createClient> | null = null
let redisAvailable = true

async function getRedisClient() {
  if (!redisAvailable) {
    return null
  }

  if (!redisClient) {
    try {
      const url = process.env.REDIS_URL || process.env.UPSTASH_KV_REST_API_URL

      if (!url) {
        console.warn("[v0] Redis not configured, caching disabled")
        redisAvailable = false
        return null
      }

      redisClient = createClient({
        url,
        socket: {
          connectTimeout: 5000,
          reconnectStrategy: (retries) => {
            if (retries > 3) {
              console.error("[v0] Redis max reconnection attempts reached")
              redisAvailable = false
              return false
            }
            return Math.min(retries * 100, 3000)
          },
        },
      })

      redisClient.on("error", (err) => {
        console.error("[v0] Redis Client Error:", err)
        redisAvailable = false
      })

      redisClient.on("connect", () => {
        console.log("[v0] ✅ Redis connected successfully")
        redisAvailable = true
      })

      await redisClient.connect()
    } catch (error) {
      console.error("[v0] Redis connection failed, continuing without cache:", error)
      redisAvailable = false
      return null
    }
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
  CHANNELS: (keyId: number) => `channels:${keyId}`,
  M3U_STATS: (keyId: number) => `m3u_stats:${keyId}`,
  SERVERS: "servers:all",
}

export const CACHE_TTL = {
  ADMIN_SESSION: 3600, // 1 hour
  USER_KEY: 1800, // 30 minutes
  M3U_CHANNELS: 3600, // 1 hour
  M3U_SOURCE: 1800, // 30 minutes
  RATE_LIMIT: 60, // 1 minute
  CHANNELS: 3600,
  M3U_STATS: 3600,
  SERVERS: 300,
}

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const client = await getRedisClient()
    if (!client) return null

    const data = await client.get(key)
    return data ? JSON.parse(data) : null
  } catch (error) {
    console.error("[v0] Redis get error, continuing without cache:", error)
    return null
  }
}

export async function setCached<T>(key: string, value: T, ttl?: number): Promise<void> {
  try {
    const client = await getRedisClient()
    if (!client) return

    const serialized = JSON.stringify(value)

    if (ttl) {
      await client.setEx(key, ttl, serialized)
    } else {
      await client.set(key, serialized)
    }
  } catch (error) {
    console.error("[v0] Redis set error, continuing without cache:", error)
  }
}

export async function deleteCached(key: string): Promise<void> {
  try {
    const client = await getRedisClient()
    if (!client) return

    await client.del(key)
  } catch (error) {
    console.error("[v0] Redis delete error:", error)
  }
}

export async function deletePattern(pattern: string): Promise<void> {
  try {
    const client = await getRedisClient()
    if (!client) return

    const keys = await client.keys(pattern)
    if (keys.length > 0) {
      await client.del(keys)
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
    const client = await getRedisClient()
    if (!client) {
      return { allowed: true, remaining: limit }
    }

    const key = CACHE_KEYS.RATE_LIMIT(identifier)

    const current = await client.incr(key)

    if (current === 1) {
      await client.expire(key, window)
    }

    const allowed = current <= limit
    const remaining = Math.max(0, limit - current)

    return { allowed, remaining }
  } catch (error) {
    console.error("[v0] Rate limit error, allowing request:", error)
    return { allowed: true, remaining: limit }
  }
}

export async function checkRedisHealth(): Promise<boolean> {
  try {
    const client = await getRedisClient()
    if (!client) return false
    await client.ping()
    return true
  } catch (error) {
    return false
  }
}

// Aliases for compatibility
export { getCached as getCache, setCached as setCache }
