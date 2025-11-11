import crypto from "crypto"
import type { NextRequest } from "next/server"
import { db } from "./db"

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString("hex")

export function encryptUrl(url: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv)
  let encrypted = cipher.update(url, "utf8", "hex")
  encrypted += cipher.final("hex")
  return iv.toString("hex") + ":" + encrypted
}

export function decryptUrl(encrypted: string): string {
  const parts = encrypted.split(":")
  const iv = Buffer.from(parts[0], "hex")
  const encryptedText = parts[1]
  const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv)
  let decrypted = decipher.update(encryptedText, "hex", "utf8")
  decrypted += decipher.final("utf8")
  return decrypted
}

export function generateToken(data: any, expiresIn = 300): string {
  const payload = {
    data,
    exp: Date.now() + expiresIn * 1000,
  }
  const token = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const signature = crypto.createHmac("sha256", ENCRYPTION_KEY).update(token).digest("base64url")
  return `${token}.${signature}`
}

export function verifyToken(token: string): any {
  try {
    const [payload, signature] = token.split(".")
    const expectedSignature = crypto.createHmac("sha256", ENCRYPTION_KEY).update(payload).digest("base64url")

    if (signature !== expectedSignature) {
      return null
    }

    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString())

    if (decoded.exp < Date.now()) {
      return null
    }

    return decoded.data
  } catch {
    return null
  }
}

export async function verifyAdminSession(request: NextRequest): Promise<any> {
  try {
    const token = request.cookies.get("admin_session")?.value

    if (!token) {
      return null
    }

    const sessionData = verifyToken(token)

    if (!sessionData) {
      return null
    }

    // Verify session in database
    const sessions = await db.query`
      SELECT admin_sessions.*, admins.username
      FROM admin_sessions
      JOIN admins ON admin_sessions.admin_id = admins.id
      WHERE admin_sessions.session_token = ${token}
      AND admin_sessions.expires_at > NOW()
    `

    if (sessions.length === 0) {
      return null
    }

    return sessions[0]
  } catch (error) {
    console.error("[v0] Admin session verification error:", error)
    return null
  }
}
