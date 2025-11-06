import { type NextRequest, NextResponse } from "next/server"

const USER_AGENTS = [
  "VLC/3.0.18 LibVLC/3.0.18",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "Kodi/20.0 (Windows NT 10.0; Win64; x64)",
]

function rewriteM3U8Urls(content: string, baseUrl: string): string {
  const lines = content.split("\n")
  const rewrittenLines = lines.map((line) => {
    const trimmedLine = line.trim()

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      return line
    }

    try {
      const absoluteUrl = new URL(trimmedLine, baseUrl).href
      const proxyUrl = `/api/stream/${encodeURIComponent(absoluteUrl)}`
      console.log("[v0] Rewritten URL:", trimmedLine, "->", proxyUrl)
      return proxyUrl
    } catch (error) {
      console.error("[v0] Failed to rewrite URL:", trimmedLine, error)
      return line
    }
  })

  return rewrittenLines.join("\n")
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    console.log("[v0] === STREAM PROXY REQUEST ===")

    const resolvedParams = await params
    const { path } = resolvedParams

    console.log("[v0] Path array:", path)

    if (!path || path.length === 0) {
      console.error("[v0] No path provided")
      return new NextResponse("No stream URL provided", { status: 400 })
    }

    const streamUrl = decodeURIComponent(path.join("/"))
    console.log("[v0] Decoded stream URL:", streamUrl)

    if (!streamUrl.startsWith("http://") && !streamUrl.startsWith("https://")) {
      console.error("[v0] Invalid URL format:", streamUrl)
      return new NextResponse("Invalid stream URL", { status: 400 })
    }

    const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
    console.log("[v0] Using User-Agent:", userAgent)

    console.log("[v0] Fetching stream...")
    const streamResponse = await fetch(streamUrl, {
      headers: {
        "User-Agent": userAgent,
        Accept: "*/*",
        Connection: "keep-alive",
        Range: request.headers.get("Range") || "",
      },
      signal: AbortSignal.timeout(30000),
    })

    console.log("[v0] Stream response status:", streamResponse.status)
    const contentType = streamResponse.headers.get("Content-Type") || ""
    console.log("[v0] Stream content-type:", contentType)

    if (!streamResponse.ok) {
      console.error("[v0] Stream fetch failed:", streamResponse.status, streamResponse.statusText)
      return new NextResponse(`Stream not available: ${streamResponse.statusText}`, { status: 502 })
    }

    const isM3U8 =
      contentType.includes("application/vnd.apple.mpegurl") ||
      contentType.includes("application/x-mpegURL") ||
      contentType.includes("audio/mpegurl") ||
      streamUrl.endsWith(".m3u8")

    if (isM3U8) {
      console.log("[v0] Detected M3U8 playlist - rewriting URLs...")
      const m3u8Content = await streamResponse.text()
      const rewrittenContent = rewriteM3U8Urls(m3u8Content, streamUrl)

      return new NextResponse(rewrittenContent, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "*",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      })
    }

    const headers = new Headers()
    headers.set("Content-Type", contentType || "video/mp2t")
    headers.set("Access-Control-Allow-Origin", "*")
    headers.set("Access-Control-Allow-Methods", "GET, OPTIONS")
    headers.set("Access-Control-Allow-Headers", "*")
    headers.set("Cache-Control", "no-cache, no-store, must-revalidate")

    if (streamResponse.headers.get("Content-Range")) {
      headers.set("Content-Range", streamResponse.headers.get("Content-Range")!)
    }
    if (streamResponse.headers.get("Content-Length")) {
      headers.set("Content-Length", streamResponse.headers.get("Content-Length")!)
    }

    console.log("[v0] Streaming response to client...")

    return new NextResponse(streamResponse.body, {
      status: streamResponse.status,
      headers,
    })
  } catch (error) {
    console.error("[v0] Stream proxy error:", error)
    return new NextResponse(`Stream error: ${error instanceof Error ? error.message : "Unknown error"}`, {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    })
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  })
}
