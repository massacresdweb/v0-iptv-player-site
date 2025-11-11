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
