import express from "express"
import axios from "axios"
import DatabasePool from "../utils/database.js"
import { verifyToken, encrypt } from "../middleware/security.js"

const router = express.Router()

// Get stream URL with load balancing
router.get("/:channelId", verifyToken, async (req, res) => {
  try {
    const { channelId } = req.params

    // Get channel info
    const channels = await DatabasePool.query("SELECT * FROM channels WHERE id = ? AND active = 1", [channelId])

    if (channels.length === 0) {
      return res.status(404).json({ error: "Kanal bulunamadı" })
    }

    const channel = channels[0]

    // Get best server (lowest load)
    const servers = await DatabasePool.query(
      "SELECT * FROM servers WHERE active = 1 ORDER BY load_percentage ASC LIMIT 1",
    )

    if (servers.length === 0) {
      return res.status(503).json({ error: "Sunucu bulunamadı" })
    }

    const server = servers[0]

    // Generate encrypted stream URL
    const streamData = {
      channelId: channel.id,
      userId: req.user.id,
      serverId: server.id,
      timestamp: Date.now(),
      expiresAt: Date.now() + 3600000, // 1 hour
    }

    const encryptedToken = encrypt(JSON.stringify(streamData))

    // Build stream URL
    const streamUrl = `${server.url}/${channel.stream_path}?token=${encryptedToken}`

    // Update server load
    await DatabasePool.query("UPDATE servers SET load_percentage = load_percentage + 0.1 WHERE id = ?", [server.id])

    res.json({
      success: true,
      streamUrl,
      channel: {
        id: channel.id,
        name: channel.name,
        logo: channel.logo,
      },
      server: {
        id: server.id,
        name: server.name,
      },
    })
  } catch (error) {
    console.error("[v0] Get stream error:", error)
    res.status(500).json({ error: "Stream URL alınamadı" })
  }
})

// Proxy stream (for additional security)
router.get("/proxy/:channelId", verifyToken, async (req, res) => {
  try {
    const { channelId } = req.params

    // Get stream URL
    const channels = await DatabasePool.query(
      "SELECT c.*, s.url as server_url FROM channels c LEFT JOIN servers s ON c.server_id = s.id WHERE c.id = ? AND c.active = 1",
      [channelId],
    )

    if (channels.length === 0) {
      return res.status(404).json({ error: "Kanal bulunamadı" })
    }

    const channel = channels[0]
    const streamUrl = `${channel.server_url}/${channel.stream_path}`

    // Proxy the stream
    const response = await axios({
      method: "GET",
      url: streamUrl,
      responseType: "stream",
      timeout: 30000,
    })

    // Set headers
    res.setHeader("Content-Type", response.headers["content-type"] || "application/vnd.apple.mpegurl")
    res.setHeader("Cache-Control", "no-cache")
    res.setHeader("Access-Control-Allow-Origin", "*")

    // Pipe stream
    response.data.pipe(res)
  } catch (error) {
    console.error("[v0] Proxy stream error:", error)
    res.status(500).json({ error: "Stream proxy hatası" })
  }
})

export default router
