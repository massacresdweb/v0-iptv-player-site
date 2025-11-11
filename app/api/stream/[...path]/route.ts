import { type NextRequest, NextResponse } from "next/server"
import { getCachedData, setCachedData } from "@/lib/redis"
import { verifyToken } from "@/lib/security"
import { cookies } from "next/headers"

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    // Verify session
    const cookieStore = await cookies()
    const token = cookieStore.get("session_token")

    if (!token || !verifyToken(token.value)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { path } = await params
    const streamUrl = decodeURIComponent(path.join("/"))

    // Cache key based on stream URL
    const cacheKey = `stream:${Buffer.from(streamUrl).toString("base64")}`

    // Check cache first
    const cached = await getCachedData<ArrayBuffer>(cacheKey)
    if (cached) {
      return new NextResponse(cached as any, {
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Cache-Control": "public, max-age=10, stale-while-revalidate=30",
          "Access-Control-Allow-Origin": "*",
        },
      })
    }

    // Fetch from IPTV source
    const response = await fetch(streamUrl, {
      headers: {
        "User-Agent": "VLC/3.0.0 LibVLC/3.0.0",
      },
    })

    if (!response.ok) {
      return NextResponse.json({ error: "Stream not available" }, { status: 502 })
    }

    const buffer = await response.arrayBuffer()

    // Cache for 10 seconds
    await setCachedData(cacheKey, buffer, 10)

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/vnd.apple.mpegurl",
        "Cache-Control": "public, max-age=10, stale-while-revalidate=30",
        "Access-Control-Allow-Origin": "*",
      },
    })
  } catch (error) {
    console.error("[v0] Stream proxy error:", error)
    return NextResponse.json({ error: "Stream error" }, { status: 500 })
  }
}
