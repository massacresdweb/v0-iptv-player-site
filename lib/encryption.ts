// Ultra-secure M3U URL encryption
// M3U URLs are NEVER exposed to client

import crypto from "crypto"

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString("hex")
const ALGORITHM = "aes-256-cbc"

export function encryptM3U(url: string): { encrypted: string; iv: string } {
  const iv = crypto.randomBytes(16)
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), "hex")
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(url, "utf8", "hex")
  encrypted += cipher.final("hex")

  return {
    encrypted,
    iv: iv.toString("hex"),
  }
}

export function decryptM3U(encrypted: string, iv: string): string {
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), "hex")
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, "hex"))

  let decrypted = decipher.update(encrypted, "hex", "utf8")
  decrypted += decipher.final("utf8")

  return decrypted
}

// Generate secure random KEY
export function generateKey(length = 16): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // No confusing chars
  let key = ""
  const bytes = crypto.randomBytes(length)

  for (let i = 0; i < length; i++) {
    key += chars[bytes[i] % chars.length]
  }

  return key
}

export { decryptM3U as decrypt }
