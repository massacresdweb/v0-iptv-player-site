import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getCache, setCache } from "@/lib/redis"
import { decrypt } from "@/lib/encryption"

const USER_AGENTS = [
  "VLC/3.0.18 LibVLC/3.0.18",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "Kodi/20.0 (Windows NT 10.0; Win64; x64)",
]

const streamCache = new Map<string, { response: Response; timestamp: number }>()

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await params
    const sessionToken = request.cookies.get("session_token")?.value

    if (!sessionToken) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const cacheKey = `session:${sessionToken}`
    let session = await getCache(cacheKey)

    if (!session) {
      const result = await sql`
        SELECT * FROM active_sessions 
        WHERE session_token = ${sessionToken} 
        AND expires_at > NOW() 
        AND is_active = true
      `

      if (result.length === 0) {
        return new NextResponse("Invalid session", { status: 401 })
      }

      session = result[0]
      await setCache(cacheKey, session, 300)
    }

    const banCacheKey = `ban:${session.key_value}`
    let isBanned = await getCache(banCacheKey)

    if (isBanned === null) {
      const keyResult = await sql`
        SELECT is_banned 
        FROM user_keys 
        WHERE key_value = ${session.key_value}
      `
      isBanned = keyResult[0]?.is_banned || false
      await setCache(banCacheKey, isBanned, 60)
    }

    if (isBanned) {
      return new NextResponse("KEY banned", { status: 403 })
    }

    const m3uCacheKey = `m3u:${session.m3u_source_id}`
    let encryptedUrl = await getCache(m3uCacheKey)

    if (!encryptedUrl) {
      const m3uResult = await sql`
        SELECT encrypted_url 
        FROM m3u_sources 
        WHERE id = ${session.m3u_source_id}
      `

      if (m3uResult.length === 0) {
        return new NextResponse("M3U not found", { status: 404 })
      }

      encryptedUrl = m3uResult[0].encrypted_url as string
      await setCache(m3uCacheKey, encryptedUrl, 600)
    }

    const realUrl = decrypt(encryptedUrl)

    if (!path || path.length === 0) {
      console.error("[v0] Stream proxy: No path provided")
      return new NextResponse("No stream URL provided", { status: 400 })
    }

    const streamUrl = decodeURIComponent(path.join("/"))

    console.log("[v0] Stream proxy: Fetching stream from:", streamUrl)

    const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]

    const streamResponse = await fetch(streamUrl, {
      headers: {
        "User-Agent": userAgent,
        Accept: "*/*",
        Connection: "keep-alive",
      },
      // @ts-ignore - keepalive is valid but TypeScript doesn't recognize it
      keepalive: true,
    })

    if (!streamResponse.ok) {
      console.error("[v0] Stream proxy: Stream fetch failed:", streamResponse.status)
      return new NextResponse("Stream not available", { status: 502 })
    }

    const response = new NextResponse(streamResponse.body, {
      status: 200,
      headers: {
        "Content-Type": streamResponse.headers.get("Content-Type") || "application/vnd.apple.mpegurl",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Access-Control-Allow-Origin": "*",
        "X-Content-Type-Options": "nosniff",
      },
    })

    return response
  } catch (error) {
    console.error("[v0] Stream proxy error:", error)
    return new NextResponse("Internal server error", { status: 500 })
  }
}
