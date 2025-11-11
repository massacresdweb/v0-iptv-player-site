import { Redis } from "@upstash/redis"

const getRedisClient = () => {
  // Local Redis for single server (no API key needed)
  if (process.env.LOCAL_REDIS_URL) {
    return new Redis({
      url: process.env.LOCAL_REDIS_URL,
      token: "local", // Not used for local Redis
    })
  }
  // Upstash for cloud deployment
  return new Redis({
    url: process.env.UPSTASH_KV_REST_API_URL!,
    token: process.env.UPSTASH_KV_REST_API_TOKEN!,
  })
}

const redis = getRedisClient()

export function getRedis() {
  return redis
}

export { redis }

export async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get<T>(key)
    return data
  } catch (error) {
    console.error("[v0] Redis get error:", error)
    return null
  }
}

export async function setCachedData(key: string, data: any, ttl = 300): Promise<void> {
  try {
    await redis.setex(key, ttl, JSON.stringify(data))
  } catch (error) {
    console.error("[v0] Redis set error:", error)
  }
}

export async function deleteCachedData(key: string): Promise<void> {
  try {
    await redis.del(key)
  } catch (error) {
    console.error("[v0] Redis delete error:", error)
  }
}

export async function clearCachePattern(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  } catch (error) {
    console.error("[v0] Redis clear pattern error:", error)
  }
}

export async function getCachedStream(url: string): Promise<{ data: Buffer | null; isStale: boolean }> {
  try {
    const cacheKey = `stream:segment:${Buffer.from(url).toString("base64").substring(0, 50)}`
    const data = await redis.get(cacheKey)

    if (!data) {
      return { data: null, isStale: false }
    }

    // Check if stale (older than 3 seconds)
    const metaKey = `${cacheKey}:meta`
    const meta = await redis.get(metaKey)
    const isStale = meta ? Date.now() - Number(meta) > 3000 : true

    return {
      data: typeof data === "string" ? Buffer.from(data, "base64") : Buffer.from(data as any),
      isStale,
    }
  } catch (error) {
    console.error("[v0] Redis stream cache error:", error)
    return { data: null, isStale: false }
  }
}

export async function setCachedStream(url: string, data: Buffer): Promise<void> {
  try {
    const cacheKey = `stream:segment:${Buffer.from(url).toString("base64").substring(0, 50)}`
    const metaKey = `${cacheKey}:meta`

    // Store segment for 30 seconds with timestamp
    await Promise.all([
      redis.setex(cacheKey, 30, data.toString("base64")),
      redis.setex(metaKey, 30, Date.now().toString()),
    ])
  } catch (error) {
    console.error("[v0] Redis stream set error:", error)
  }
}

// Connection pool management
export async function trackConnection(key: string, token: string): Promise<boolean> {
  try {
    const connKey = `conn:${key}:${token}`
    await redis.setex(connKey, 300, "1") // 5 min TTL
    return true
  } catch (error) {
    console.error("[v0] Connection tracking error:", error)
    return false
  }
}

export async function getActiveConnections(key: string): Promise<number> {
  try {
    const keys = await redis.keys(`conn:${key}:*`)
    return keys.length
  } catch (error) {
    console.error("[v0] Get connections error:", error)
    return 0
  }
}
