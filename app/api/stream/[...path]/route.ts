import { type NextRequest, NextResponse } from "next/server"
import { getCachedStream, setCachedStream, trackConnection } from "@/lib/redis"
import { verifyToken } from "@/lib/security"
import { cookies } from "next/headers"
import { selectOptimalServer, recordServerSuccess, recordServerFailure } from "@/lib/load-balancer"

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const startTime = Date.now()

  try {
    // Verify session
    const cookieStore = await cookies()
    const token = cookieStore.get("session_token")

    if (!token || !verifyToken(token.value)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { path } = await params
    const streamPath = path.join("/")
    const streamUrl = decodeURIComponent(streamPath)

    // Track connection
    await trackConnection(token.value, streamUrl)

    // Try cache first (ultra aggressive)
    const cached = await getCachedStream(streamUrl)

    if (cached.data) {
      // Serve from cache (stale-while-revalidate pattern)
      const response = new NextResponse(cached.data, {
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Cache-Control": "public, max-age=10, stale-while-revalidate=30",
          "Access-Control-Allow-Origin": "*",
          "X-Cache-Status": cached.isStale ? "STALE" : "HIT",
          "X-Response-Time": `${Date.now() - startTime}ms`,
        },
      })

      // Refresh cache in background if stale
      if (cached.isStale) {
        fetchAndCacheStream(streamUrl).catch(() => {})
      }

      return response
    }

    // Cache miss - fetch from source
    const buffer = await fetchAndCacheStream(streamUrl)

    if (!buffer) {
      return NextResponse.json({ error: "Stream not available" }, { status: 502 })
    }

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "public, max-age=10, stale-while-revalidate=30",
        "Access-Control-Allow-Origin": "*",
        "X-Cache-Status": "MISS",
        "X-Response-Time": `${Date.now() - startTime}ms`,
      },
    })
  } catch (error) {
    console.error("[v0] Stream proxy error:", error)
    return NextResponse.json({ error: "Stream error" }, { status: 500 })
  }
}

async function fetchAndCacheStream(url: string): Promise<Buffer | null> {
  try {
    // Select optimal server from load balancer
    const server = await selectOptimalServer()
    const fetchUrl = server ? url.replace(/^https?:\/\/[^/]+/, server) : url

    const fetchStart = Date.now()
    const response = await fetch(fetchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "*/*",
        Connection: "keep-alive",
      },
      // @ts-ignore
      keepalive: true,
      signal: AbortSignal.timeout(5000), // 5s timeout
    })

    if (!response.ok) {
      if (server) recordServerFailure(server)
      return null
    }

    const buffer = Buffer.from(await response.arrayBuffer())

    // Record success
    if (server) recordServerSuccess(server, Date.now() - fetchStart)

    // Cache aggressively
    await setCachedStream(url, buffer)

    return buffer
  } catch (error) {
    console.error("[v0] Fetch stream error:", error)
    return null
  }
}
