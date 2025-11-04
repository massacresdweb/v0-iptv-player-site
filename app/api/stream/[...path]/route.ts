import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
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
      const db = await getDb()
      const result = await db.execute(
        "SELECT * FROM active_sessions WHERE session_token = ? AND expires_at > NOW() AND is_active = true",
        [sessionToken],
      )

      if (result.rows.length === 0) {
        return new NextResponse("Invalid session", { status: 401 })
      }

      session = result.rows[0]
      await setCache(cacheKey, session, 300)
    }

    const banCacheKey = `ban:${session.key_value}`
    let isBanned = await getCache(banCacheKey)

    if (isBanned === null) {
      const keyResult = await (await getDb()).execute("SELECT is_banned FROM user_keys WHERE key_value = ?", [
        session.key_value,
      ])
      isBanned = keyResult.rows[0]?.is_banned || false
      await setCache(banCacheKey, isBanned, 60)
    }

    if (isBanned) {
      return new NextResponse("KEY banned", { status: 403 })
    }

    const m3uCacheKey = `m3u:${session.m3u_source_id}`
    let encryptedUrl = await getCache(m3uCacheKey)

    if (!encryptedUrl) {
      const m3uResult = await (await getDb()).execute("SELECT encrypted_url FROM m3u_sources WHERE id = ?", [
        session.m3u_source_id,
      ])

      if (m3uResult.rows.length === 0) {
        return new NextResponse("M3U not found", { status: 404 })
      }

      encryptedUrl = m3uResult.rows[0].encrypted_url as string
      await setCache(m3uCacheKey, encryptedUrl, 600)
    }

    const realUrl = decrypt(encryptedUrl)

    const streamPath = path.join("/")
    let streamUrl = realUrl.includes("?") ? `${realUrl}&path=${streamPath}` : `${realUrl}/${streamPath}`

    const servers = await getCache("servers:active")
    if (servers && Array.isArray(servers) && servers.length > 0) {
      // Round-robin load balancing
      const serverIndex = Math.floor(Math.random() * servers.length)
      const server = servers[serverIndex]
      streamUrl = streamUrl.replace(new URL(realUrl).origin, server.url)
    }

    const streamCacheKey = `stream:${streamPath}`
    const cached = streamCache.get(streamCacheKey)
    if (cached && Date.now() - cached.timestamp < 5000) {
      return cached.response.clone()
    }

    const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]

    const streamResponse = await fetch(streamUrl, {
      headers: {
        "User-Agent": userAgent,
        Accept: "*/*",
        Connection: "keep-alive",
        "X-Forwarded-For": "127.0.0.1",
        "X-Real-IP": "127.0.0.1",
      },
      keepalive: true,
    })

    if (!streamResponse.ok) {
      return new NextResponse("Stream error", { status: 502 })
    }

    const response = new NextResponse(streamResponse.body, {
      status: 200,
      headers: {
        "Content-Type": streamResponse.headers.get("Content-Type") || "application/vnd.apple.mpegurl",
        "Cache-Control": "public, max-age=10",
        "Access-Control-Allow-Origin": "*",
        "X-Content-Type-Options": "nosniff",
      },
    })

    streamCache.set(streamCacheKey, { response: response.clone(), timestamp: Date.now() })

    if (streamCache.size > 100) {
      const oldestKey = Array.from(streamCache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0]
      streamCache.delete(oldestKey)
    }

    return response
  } catch (error) {
    console.error("[v0] Stream proxy error:", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
