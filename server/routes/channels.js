import express from "express"
import DatabasePool from "../utils/database.js"
import RedisCache from "../utils/redis.js"
import { verifyToken } from "../middleware/security.js"

const router = express.Router()

// Get all channels (ultra-fast with caching)
router.get("/", verifyToken, async (req, res) => {
  try {
    // Check cache first
    let channels = await RedisCache.getCachedChannels()

    if (!channels) {
      // Query database
      channels = await DatabasePool.query(`
        SELECT c.*, s.url as server_url, s.name as server_name, s.load_percentage
        FROM channels c
        LEFT JOIN servers s ON c.server_id = s.id
        WHERE c.active = 1 AND s.active = 1
        ORDER BY c.sort_order ASC
      `)

      // Cache for 5 minutes
      await RedisCache.cacheChannels(channels, 300)
    }

    // Add viewer counts
    for (const channel of channels) {
      channel.viewers = await RedisCache.getViewers(channel.id)
    }

    res.json({ success: true, channels })
  } catch (error) {
    console.error("[v0] Get channels error:", error)
    res.status(500).json({ error: "Kanal listesi alınamadı" })
  }
})

// Get channel by ID
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params

    const channels = await DatabasePool.query("SELECT * FROM channels WHERE id = ? AND active = 1", [id])

    if (channels.length === 0) {
      return res.status(404).json({ error: "Kanal bulunamadı" })
    }

    const channel = channels[0]
    channel.viewers = await RedisCache.getViewers(channel.id)

    res.json({ success: true, channel })
  } catch (error) {
    console.error("[v0] Get channel error:", error)
    res.status(500).json({ error: "Kanal bilgisi alınamadı" })
  }
})

// Search channels
router.get("/search/:query", verifyToken, async (req, res) => {
  try {
    const { query } = req.params

    const channels = await DatabasePool.query(
      "SELECT * FROM channels WHERE (name LIKE ? OR category LIKE ?) AND active = 1",
      [`%${query}%`, `%${query}%`],
    )

    res.json({ success: true, channels })
  } catch (error) {
    console.error("[v0] Search channels error:", error)
    res.status(500).json({ error: "Arama hatası" })
  }
})

export default router
