import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"
import bcrypt from "bcryptjs"
import { sql } from "./db"
import type { Admin, UserKey } from "./db"
import { getCached, setCached, CACHE_KEYS, CACHE_TTL } from "./redis"

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "change-this-secret-in-production-use-openssl-rand-hex-32",
)

export interface AdminSessionPayload {
  adminId: number
  username: string
}

export interface UserSessionPayload {
  keyCode: string
  m3uSourceId: number
  sessionToken: string
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createAdminSession(admin: Admin): Promise<string> {
  const payload: AdminSessionPayload = {
    adminId: admin.id,
    username: admin.username,
  }

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET)

  await setCached(CACHE_KEYS.ADMIN_SESSION(token), payload, CACHE_TTL.ADMIN_SESSION)

  const cookieStore = await cookies()
  cookieStore.set("admin_session", token, {
    httpOnly: true,
    secure: false, // Allow HTTP for development/testing
    sameSite: "lax", // Changed from "strict" to "lax" for better compatibility
    maxAge: 86400, // 24 hours instead of 1 hour
    path: "/",
  })

  console.log("[v0] Admin session cookie set successfully")

  return token
}

export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("admin_session")?.value

    console.log("[v0] Checking admin session, token exists:", !!token)

    if (!token) return null

    const cached = await getCached<AdminSessionPayload>(CACHE_KEYS.ADMIN_SESSION(token))
    if (cached) {
      console.log("[v0] Admin session found in cache")
      return cached
    }

    const { payload } = await jwtVerify(token, JWT_SECRET)
    const session = payload as AdminSessionPayload
    await setCached(CACHE_KEYS.ADMIN_SESSION(token), session, CACHE_TTL.ADMIN_SESSION)
    console.log("[v0] Admin session verified from JWT")
    return session
  } catch (error) {
    console.error("[v0] Admin session verification failed:", error)
    return null
  }
}

export async function requireAdmin(): Promise<AdminSessionPayload> {
  const session = await getAdminSession()
  if (!session) {
    throw new Error("Unauthorized: Admin access required")
  }
  return session
}

export async function validateKey(keyCode: string): Promise<UserKey | null> {
  const cached = await getCached<UserKey>(CACHE_KEYS.USER_KEY(keyCode))
  if (cached) return cached

  const result = await sql`
    SELECT * FROM user_keys 
    WHERE key_code = ${keyCode} 
    AND is_active = true 
    AND (expires_at IS NULL OR expires_at > NOW())
    LIMIT 1
  `

  const key = result[0] as UserKey | undefined
  if (key) {
    await setCached(CACHE_KEYS.USER_KEY(keyCode), key, CACHE_TTL.USER_KEY)

    // Update last_used_at
    await sql`UPDATE user_keys SET last_used_at = NOW() WHERE key_code = ${keyCode}`
  }

  return key || null
}

export async function createUserSession(keyCode: string, m3uSourceId: number): Promise<string> {
  const sessionToken = crypto.randomUUID()

  const payload: UserSessionPayload = {
    keyCode,
    m3uSourceId,
    sessionToken,
  }

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET)

  const cookieStore = await cookies()
  cookieStore.set("user_session", token, {
    httpOnly: true,
    secure: false, // Allow HTTP for development/testing
    sameSite: "lax",
    maxAge: 86400,
    path: "/",
  })

  console.log("[v0] User session cookie set successfully")

  return sessionToken
}

export async function getUserSession(): Promise<UserSessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("user_session")?.value

  console.log("[v0] getUserSession called, token exists:", !!token)

  if (!token) {
    console.log("[v0] No session token found in cookies")
    return null
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    console.log("[v0] Session verified successfully, keyCode:", (payload as UserSessionPayload).keyCode)
    return payload as UserSessionPayload
  } catch (error) {
    console.error("[v0] Session verification failed:", error)
    return null
  }
}

export const requireAuth = requireAdmin
export const verifyAdminToken = getAdminSession
export const createSession = createUserSession
export const getSession = getUserSession

export async function deleteSession() {
  const cookieStore = await cookies()
  cookieStore.delete("user_session")
  cookieStore.delete("admin_session")
}
