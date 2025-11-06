import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { url: string[] } }) {
  try {
    // Decode the stream URL from params
    const streamUrl = decodeURIComponent(params.url.join("/"))

    console.log("[v0] Stream proxy request for:", streamUrl)

    // Fetch the stream
    const response = await fetch(streamUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "*/*",
        "Accept-Encoding": "gzip, deflate",
        Connection: "keep-alive",
      },
    })

    if (!response.ok) {
      console.error("[v0] Stream fetch failed:", response.status)
      return new NextResponse("Stream not available", { status: response.status })
    }

    // Get content type
    const contentType = response.headers.get("content-type") || "video/mp2t"

    // Stream the response
    return new NextResponse(response.body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Range, Content-Type",
      },
    })
  } catch (error) {
    console.error("[v0] Stream proxy error:", error)
    return new NextResponse("Stream error", { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Range, Content-Type",
    },
  })
}
