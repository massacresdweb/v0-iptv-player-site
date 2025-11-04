import express from "express"
import DatabasePool from "../utils/database.js"
import RedisCache from "../utils/redis.js"
import { verifyToken, verifyAdmin } from "../middleware/security.js"

const router = express.Router()

// All admin routes require authentication and admin role
router.use(verifyToken)
router.use(verifyAdmin)

// Get all servers
router.get("/servers", async (req, res) => {
  try {
    const servers = await DatabasePool.query("SELECT * FROM servers ORDER BY id ASC")
    res.json({ success: true, servers })
  } catch (error) {
    console.error("[v0] Get servers error:", error)
    res.status(500).json({ error: "Sunucu listesi alınamadı" })
  }
})

// Add server
router.post("/servers", async (req, res) => {
  try {
    const { name, url, max_load } = req.body

    const result = await DatabasePool.query(
      "INSERT INTO servers (name, url, max_load, load_percentage, active, created_at) VALUES (?, ?, ?, 0, 1, NOW())",
      [name, url, max_load || 100],
    )

    res.json({ success: true, serverId: result.insertId })
  } catch (error) {
    console.error("[v0] Add server error:", error)
    res.status(500).json({ error: "Sunucu eklenemedi" })
  }
})

// Update server
router.put("/servers/:id", async (req, res) => {
  try {
    const { id } = req.params
    const { name, url, max_load, active } = req.body

    await DatabasePool.query("UPDATE servers SET name = ?, url = ?, max_load = ?, active = ? WHERE id = ?", [
      name,
      url,
      max_load,
      active,
      id,
    ])

    res.json({ success: true })
  } catch (error) {
    console.error("[v0] Update server error:", error)
    res.status(500).json({ error: "Sunucu güncellenemedi" })
  }
})

// Delete server
router.delete("/servers/:id", async (req, res) => {
  try {
    const { id } = req.params

    await DatabasePool.query("DELETE FROM servers WHERE id = ?", [id])

    res.json({ success: true })
  } catch (error) {
    console.error("[v0] Delete server error:", error)
    res.status(500).json({ error: "Sunucu silinemedi" })
  }
})

// Get all channels
router.get("/channels", async (req, res) => {
  try {
    const channels = await DatabasePool.query("SELECT * FROM channels ORDER BY sort_order ASC")
    res.json({ success: true, channels })
  } catch (error) {
    console.error("[v0] Get channels error:", error)
    res.status(500).json({ error: "Kanal listesi alınamadı" })
  }
})

// Add channel
router.post("/channels", async (req, res) => {
  try {
    const { name, logo, category, stream_path, server_id, sort_order } = req.body

    const result = await DatabasePool.query(
      "INSERT INTO channels (name, logo, category, stream_path, server_id, sort_order, active, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, NOW())",
      [name, logo, category, stream_path, server_id, sort_order || 0],
    )

    // Clear channel cache
    await RedisCache.del("channels:list")

    res.json({ success: true, channelId: result.insertId })
  } catch (error) {
    console.error("[v0] Add channel error:", error)
    res.status(500).json({ error: "Kanal eklenemedi" })
  }
})

// Update channel
router.put("/channels/:id", async (req, res) => {
  try {
    const { id } = req.params
    const { name, logo, category, stream_path, server_id, sort_order, active } = req.body

    await DatabasePool.query(
      "UPDATE channels SET name = ?, logo = ?, category = ?, stream_path = ?, server_id = ?, sort_order = ?, active = ? WHERE id = ?",
      [name, logo, category, stream_path, server_id, sort_order, active, id],
    )

    // Clear channel cache
    await RedisCache.del("channels:list")

    res.json({ success: true })
  } catch (error) {
    console.error("[v0] Update channel error:", error)
    res.status(500).json({ error: "Kanal güncellenemedi" })
  }
})

// Delete channel
router.delete("/channels/:id", async (req, res) => {
  try {
    const { id } = req.params

    await DatabasePool.query("DELETE FROM channels WHERE id = ?", [id])

    // Clear channel cache
    await RedisCache.del("channels:list")

    res.json({ success: true })
  } catch (error) {
    console.error("[v0] Delete channel error:", error)
    res.status(500).json({ error: "Kanal silinemedi" })
  }
})

// Get statistics
router.get("/stats", async (req, res) => {
  try {
    const [userCount] = await DatabasePool.query("SELECT COUNT(*) as count FROM users")
    const [channelCount] = await DatabasePool.query("SELECT COUNT(*) as count FROM channels WHERE active = 1")
    const [serverCount] = await DatabasePool.query("SELECT COUNT(*) as count FROM servers WHERE active = 1")

    // Get total viewers from Redis
    const channels = await DatabasePool.query("SELECT id FROM channels WHERE active = 1")
    let totalViewers = 0
    for (const channel of channels) {
      totalViewers += await RedisCache.getViewers(channel.id)
    }

    res.json({
      success: true,
      stats: {
        users: userCount[0].count,
        channels: channelCount[0].count,
        servers: serverCount[0].count,
        activeViewers: totalViewers,
      },
    })
  } catch (error) {
    console.error("[v0] Get stats error:", error)
    res.status(500).json({ error: "İstatistikler alınamadı" })
  }
})

export default router
