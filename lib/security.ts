// Ultra-secure security utilities
// Anti-debug, anti-tamper, request signing

import type { NextRequest } from "next/server"
import crypto from "crypto"

// Anti-debug detection
export function detectDebugger(): boolean {
  if (typeof window === "undefined") return false

  // Check for DevTools
  const threshold = 160
  const widthThreshold = window.outerWidth - window.innerWidth > threshold
  const heightThreshold = window.outerHeight - window.innerHeight > threshold

  return widthThreshold || heightThreshold
}

// Generate secure API key
export function generateApiKey(): string {
  return crypto.randomBytes(32).toString("hex")
}

// Generate device fingerprint
export function generateDeviceId(req: NextRequest): string {
  const userAgent = req.headers.get("user-agent") || ""
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown"
  const acceptLanguage = req.headers.get("accept-language") || ""

  const fingerprint = `${userAgent}|${ip}|${acceptLanguage}`
  return crypto.createHash("sha256").update(fingerprint).digest("hex")
}

// Sign request for tamper protection
export function signRequest(data: any, secret: string): string {
  const payload = JSON.stringify(data)
  return crypto.createHmac("sha256", secret).update(payload).digest("hex")
}

// Verify request signature
export function verifySignature(data: any, signature: string, secret: string): boolean {
  const expectedSignature = signRequest(data, secret)
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
}

// Encrypt stream URL
export function encryptStreamUrl(url: string, key: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(key.padEnd(32, "0").slice(0, 32)), iv)

  let encrypted = cipher.update(url, "utf8", "hex")
  encrypted += cipher.final("hex")

  return iv.toString("hex") + ":" + encrypted
}

// Decrypt stream URL
export function decryptStreamUrl(encryptedUrl: string, key: string): string {
  const parts = encryptedUrl.split(":")
  const iv = Buffer.from(parts[0], "hex")
  const encrypted = parts[1]

  const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(key.padEnd(32, "0").slice(0, 32)), iv)

  let decrypted = decipher.update(encrypted, "hex", "utf8")
  decrypted += decipher.final("utf8")

  return decrypted
}

// Rate limit key generator
export function getRateLimitKey(req: NextRequest, identifier: string): string {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown"
  return `ratelimit:${identifier}:${ip}`
}

// Check if IP is whitelisted
export function isIpWhitelisted(ip: string, whitelist: string[]): boolean {
  if (!whitelist || whitelist.length === 0) return true
  return whitelist.includes(ip)
}
