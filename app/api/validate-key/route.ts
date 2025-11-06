import { type NextRequest, NextResponse } from "next/server"
import { validateKey, createUserSession, getUserSession } from "@/lib/auth"
import { checkRateLimit } from "@/lib/redis"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] validate-key GET API called (session check)")

    const session = await getUserSession()

    if (!session) {
      console.log("[v0] No session found")
      return NextResponse.json({ error: "No session" }, { status: 401 })
    }

    console.log("[v0] Session found, validating key:", session.keyCode)

    // Validate KEY from database
    const keyResult = await sql`
      SELECT key_code, m3u_source_id, expires_at, is_active, is_banned
      FROM user_keys 
      WHERE key_code = ${session.keyCode}
    `

    if (keyResult.length === 0) {
      console.log("[v0] KEY not found in database")
      return NextResponse.json({ error: "KEY not found" }, { status: 401 })
    }

    const key = keyResult[0]

    if (key.is_banned || !key.is_active) {
      console.log("[v0] KEY is banned or inactive")
      return NextResponse.json({ error: "KEY is not valid" }, { status: 401 })
    }

    if (key.expires_at && new Date(key.expires_at as string) < new Date()) {
      console.log("[v0] KEY expired")
      return NextResponse.json({ error: "KEY expired" }, { status: 401 })
    }

    console.log("[v0] Session validated successfully")

    return NextResponse.json({
      success: true,
      key: key.key_code,
      expiresAt: key.expires_at,
      m3uSourceId: key.m3u_source_id,
    })
  } catch (error) {
    console.error("[v0] Session check error:", error)
    return NextResponse.json({ error: "Session check failed" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] validate-key API called")

    const { keyCode } = await request.json()
    console.log("[v0] Received keyCode:", keyCode ? "YES" : "NO")

    if (!keyCode) {
      return NextResponse.json({ error: "KEY gerekli" }, { status: 400 })
    }

    // Rate limiting
    const ip = request.headers.get("x-forwarded-for") || "unknown"
    const { allowed } = await checkRateLimit(`key-validate:${ip}`, 10, 60)

    if (!allowed) {
      return NextResponse.json({ error: "Çok fazla deneme. Lütfen bekleyin." }, { status: 429 })
    }

    console.log("[v0] Validating key:", keyCode.toUpperCase())
    const key = await validateKey(keyCode.toUpperCase())

    if (!key) {
      console.log("[v0] Key validation failed: invalid or expired")
      return NextResponse.json({ error: "Geçersiz veya süresi dolmuş KEY" }, { status: 401 })
    }

    console.log("[v0] Key validated successfully:", key.key_code)
    console.log("[v0] Creating user session...")

    const sessionToken = await createUserSession(key.key_code, key.m3u_source_id)

    console.log("[v0] User session created, token:", sessionToken)
    console.log("[v0] Cookie should be set now")

    return NextResponse.json({
      success: true,
      sessionToken,
      m3uSourceId: key.m3u_source_id,
    })
  } catch (error) {
    console.error("[v0] Key validation error:", error)
    return NextResponse.json({ error: "Doğrulama başarısız" }, { status: 500 })
  }
}
