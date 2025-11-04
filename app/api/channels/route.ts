import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getCache, setCache } from "@/lib/redis"
import { parseM3U } from "@/lib/m3u-parser"
import { decrypt } from "@/lib/encryption"

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("session_token")?.value

    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get session from cache or DB
    const cacheKey = `session:${sessionToken}`
    let session = await getCache(cacheKey)

    if (!session) {
      const db = await getDb()
      const result = await db.execute(
        "SELECT * FROM active_sessions WHERE session_token = ? AND expires_at > NOW() AND is_active = true",
        [sessionToken],
      )

      if (result.rows.length === 0) {
        return NextResponse.json({ error: "Invalid session" }, { status: 401 })
      }

      session = result.rows[0]
      await setCache(cacheKey, session, 300)
    }

    // Check if KEY is banned
    const db = await getDb()
    const keyResult = await db.execute("SELECT is_banned, expires_at FROM user_keys WHERE key_value = ?", [
      session.key_value,
    ])

    if (keyResult.rows.length === 0 || keyResult.rows[0].is_banned) {
      return NextResponse.json({ error: "KEY banned or invalid" }, { status: 403 })
    }

    // Check if KEY expired
    const expiresAt = new Date(keyResult.rows[0].expires_at as string)
    if (expiresAt < new Date()) {
      return NextResponse.json({ error: "KEY expired" }, { status: 403 })
    }

    // Get channels from cache
    const channelsCacheKey = `channels:${session.m3u_source_id}`
    let channels = await getCache(channelsCacheKey)

    if (!channels) {
      // Get M3U source
      const m3uResult = await db.execute("SELECT encrypted_url FROM m3u_sources WHERE id = ?", [session.m3u_source_id])

      if (m3uResult.rows.length === 0) {
        return NextResponse.json({ error: "M3U not found" }, { status: 404 })
      }

      // Decrypt and parse M3U
      const m3uUrl = decrypt(m3uResult.rows[0].encrypted_url as string)
      channels = await parseM3U(m3uUrl)

      // Cache for 1 hour
      await setCache(channelsCacheKey, channels, 3600)
    }

    return NextResponse.json({ channels, cached: !!channels })
  } catch (error) {
    console.error("[v0] Get channels error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
