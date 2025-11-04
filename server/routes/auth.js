import express from "express"
import crypto from "crypto"
import bcrypt from "bcrypt"
import DatabasePool from "../utils/database.js"
import RedisCache from "../utils/redis.js"

const router = express.Router()

// Ultra-fast login
router.post("/login", async (req, res) => {
  try {
    const { username, password, hwid } = req.body

    if (!username || !password) {
      return res.status(400).json({ error: "Kullanıcı adı ve şifre gerekli" })
    }

    // Check cache first
    const cacheKey = `user:${username}`
    let user = await RedisCache.get(cacheKey)

    if (user) {
      user = JSON.parse(user)
    } else {
      // Query database
      const users = await DatabasePool.query("SELECT * FROM users WHERE username = ? LIMIT 1", [username])

      if (users.length === 0) {
        return res.status(401).json({ error: "Kullanıcı bulunamadı" })
      }

      user = users[0]
      // Cache user for 5 minutes
      await RedisCache.set(cacheKey, JSON.stringify(user), 300)
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return res.status(401).json({ error: "Hatalı şifre" })
    }

    // Check HWID if enabled
    if (user.hwid && user.hwid !== hwid) {
      return res.status(403).json({ error: "Bu cihazdan giriş yapılamaz" })
    }

    // Update HWID if not set
    if (!user.hwid && hwid) {
      await DatabasePool.query("UPDATE users SET hwid = ? WHERE id = ?", [hwid, user.id])
      user.hwid = hwid
    }

    // Generate session token
    const token = crypto.randomBytes(32).toString("hex")
    const sessionData = {
      id: user.id,
      username: user.username,
      role: user.role,
      hwid: user.hwid,
      expiresAt: Date.now() + 86400000, // 24 hours
    }

    // Store session in Redis (ultra-fast access)
    await RedisCache.setSession(token, sessionData, 86400)

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("[v0] Login error:", error)
    res.status(500).json({ error: "Giriş hatası" })
  }
})

// Register
router.post("/register", async (req, res) => {
  try {
    const { username, password, email } = req.body

    if (!username || !password || !email) {
      return res.status(400).json({ error: "Tüm alanlar gerekli" })
    }

    // Check if user exists
    const existing = await DatabasePool.query("SELECT id FROM users WHERE username = ? OR email = ?", [username, email])

    if (existing.length > 0) {
      return res.status(409).json({ error: "Kullanıcı zaten mevcut" })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Insert user
    const result = await DatabasePool.query(
      "INSERT INTO users (username, password, email, role, created_at) VALUES (?, ?, ?, ?, NOW())",
      [username, hashedPassword, email, "user"],
    )

    res.json({
      success: true,
      message: "Kayıt başarılı",
      userId: result.insertId,
    })
  } catch (error) {
    console.error("[v0] Register error:", error)
    res.status(500).json({ error: "Kayıt hatası" })
  }
})

// Logout
router.post("/logout", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "")

    if (token) {
      await RedisCache.deleteSession(token)
    }

    res.json({ success: true, message: "Çıkış başarılı" })
  } catch (error) {
    console.error("[v0] Logout error:", error)
    res.status(500).json({ error: "Çıkış hatası" })
  }
})

// Verify token
router.get("/verify", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "")

    if (!token) {
      return res.status(401).json({ error: "Token gerekli" })
    }

    const session = await RedisCache.getSession(token)

    if (!session) {
      return res.status(401).json({ error: "Geçersiz token" })
    }

    res.json({ success: true, user: session })
  } catch (error) {
    console.error("[v0] Verify error:", error)
    res.status(500).json({ error: "Doğrulama hatası" })
  }
})

export default router
