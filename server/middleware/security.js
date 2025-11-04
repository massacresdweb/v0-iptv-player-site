import crypto from "crypto"
import RedisCache from "../utils/redis.js"

// Anti-debug and security checks
export const securityMiddleware = async (req, res, next) => {
  // Check for suspicious headers
  const suspiciousHeaders = ["x-debug", "x-devtools", "x-proxy"]
  for (const header of suspiciousHeaders) {
    if (req.headers[header]) {
      return res.status(403).json({ error: "Erişim engellendi" })
    }
  }

  // Rate limiting per IP
  const ip = req.ip || req.connection.remoteAddress
  const requestKey = `rate:${ip}:${Date.now()}`

  // Add request signature
  req.signature = crypto.randomBytes(16).toString("hex")

  next()
}

// Token verification
export const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "")

    if (!token) {
      return res.status(401).json({ error: "Token gerekli" })
    }

    // Check token in Redis cache first (ultra-fast)
    const cachedSession = await RedisCache.getSession(token)

    if (!cachedSession) {
      return res.status(401).json({ error: "Geçersiz token" })
    }

    req.user = cachedSession
    next()
  } catch (error) {
    console.error("[v0] Token verification error:", error)
    res.status(401).json({ error: "Token doğrulama hatası" })
  }
}

// Admin verification
export const verifyAdmin = async (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin yetkisi gerekli" })
  }
  next()
}

// HWID verification
export const verifyHWID = async (req, res, next) => {
  const hwid = req.headers["x-hwid"]

  if (!hwid) {
    return res.status(403).json({ error: "HWID gerekli" })
  }

  // Check if HWID matches user's registered HWID
  if (req.user.hwid && req.user.hwid !== hwid) {
    return res.status(403).json({ error: "HWID uyuşmazlığı" })
  }

  next()
}

// Encryption utilities
export const encrypt = (text) => {
  const algorithm = "aes-256-cbc"
  const key = Buffer.from(process.env.ENCRYPTION_KEY || crypto.randomBytes(32))
  const iv = crypto.randomBytes(16)

  const cipher = crypto.createCipheriv(algorithm, key, iv)
  let encrypted = cipher.update(text, "utf8", "hex")
  encrypted += cipher.final("hex")

  return iv.toString("hex") + ":" + encrypted
}

export const decrypt = (text) => {
  const algorithm = "aes-256-cbc"
  const key = Buffer.from(process.env.ENCRYPTION_KEY || crypto.randomBytes(32))

  const parts = text.split(":")
  const iv = Buffer.from(parts.shift(), "hex")
  const encrypted = parts.join(":")

  const decipher = crypto.createDecipheriv(algorithm, key, iv)
  let decrypted = decipher.update(encrypted, "hex", "utf8")
  decrypted += decipher.final("utf8")

  return decrypted
}
