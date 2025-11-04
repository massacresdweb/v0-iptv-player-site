import { createClient } from "redis"

class RedisCache {
  constructor() {
    this.client = null
    this.isReady = false
  }

  async connect() {
    try {
      this.client = createClient({
        url: process.env.REDIS_URL || "redis://localhost:6379",
        socket: {
          reconnectStrategy: (retries) => Math.min(retries * 50, 500),
        },
      })

      this.client.on("error", (err) => console.error("[v0] Redis Error:", err))
      this.client.on("connect", () => console.log("[v0] Redis connecting..."))
      this.client.on("ready", () => {
        this.isReady = true
        console.log("[v0] Redis ready!")
      })

      await this.client.connect()
    } catch (error) {
      console.error("[v0] Redis connection failed:", error)
      this.isReady = false
    }
  }

  isConnected() {
    return this.isReady
  }

  async ping() {
    try {
      await this.client.ping()
      return "ok"
    } catch {
      return "error"
    }
  }

  // Ultra-fast caching methods
  async get(key) {
    if (!this.isReady) return null
    try {
      return await this.client.get(key)
    } catch (error) {
      console.error("[v0] Redis GET error:", error)
      return null
    }
  }

  async set(key, value, ttl = 3600) {
    if (!this.isReady) return false
    try {
      await this.client.setEx(key, ttl, typeof value === "string" ? value : JSON.stringify(value))
      return true
    } catch (error) {
      console.error("[v0] Redis SET error:", error)
      return false
    }
  }

  async del(key) {
    if (!this.isReady) return false
    try {
      await this.client.del(key)
      return true
    } catch (error) {
      console.error("[v0] Redis DEL error:", error)
      return false
    }
  }

  // Channel viewer tracking
  async incrementViewers(channelId) {
    if (!this.isReady) return 0
    try {
      return await this.client.incr(`viewers:${channelId}`)
    } catch (error) {
      console.error("[v0] Redis INCR error:", error)
      return 0
    }
  }

  async decrementViewers(channelId) {
    if (!this.isReady) return 0
    try {
      const count = await this.client.decr(`viewers:${channelId}`)
      return Math.max(0, count)
    } catch (error) {
      console.error("[v0] Redis DECR error:", error)
      return 0
    }
  }

  async getViewers(channelId) {
    if (!this.isReady) return 0
    try {
      const count = await this.client.get(`viewers:${channelId}`)
      return Number.parseInt(count || "0", 10)
    } catch (error) {
      console.error("[v0] Redis GET error:", error)
      return 0
    }
  }

  // Session management
  async setSession(sessionId, data, ttl = 86400) {
    return await this.set(`session:${sessionId}`, data, ttl)
  }

  async getSession(sessionId) {
    const data = await this.get(`session:${sessionId}`)
    return data ? JSON.parse(data) : null
  }

  async deleteSession(sessionId) {
    return await this.del(`session:${sessionId}`)
  }

  // Channel list caching
  async cacheChannels(channels, ttl = 300) {
    return await this.set("channels:list", channels, ttl)
  }

  async getCachedChannels() {
    const data = await this.get("channels:list")
    return data ? JSON.parse(data) : null
  }
}

export default new RedisCache()
export { RedisCache }
