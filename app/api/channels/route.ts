import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCachedData, setCachedData } from "@/lib/redis"
import { verifyToken } from "@/lib/security"
import { cookies } from "next/headers"

interface Channel {
  id: string
  name: string
  logo: string
  category: string
  url: string
}

async function parseM3U(url: string): Promise<Channel[]> {
  const response = await fetch(url)
  const content = await response.text()

  const channels: Channel[] = []
  const lines = content.split("\n")

  let currentChannel: Partial<Channel> = {}

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    if (line.startsWith("#EXTINF:")) {
      const nameMatch = line.match(/,(.+)$/)
      const logoMatch = line.match(/tvg-logo="([^"]+)"/)
      const groupMatch = line.match(/group-title="([^"]+)"/)

      currentChannel = {
        id: crypto.randomUUID(),
        name: nameMatch ? nameMatch[1].trim() : "Unknown",
        logo: logoMatch ? logoMatch[1] : "/placeholder.svg?height=40&width=40",
        category: groupMatch ? groupMatch[1] : "Other",
      }
    } else if (line && !line.startsWith("#") && currentChannel.name) {
      currentChannel.url = line
      channels.push(currentChannel as Channel)
      currentChannel = {}
    }
  }

  return channels
}

export async function GET(req: NextRequest) {
  try {
    // Verify session
    const cookieStore = await cookies()
    const token = cookieStore.get("session_token")

    if (!token || !verifyToken(token.value)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check cache
    const cacheKey = "channels:all"
    const cached = await getCachedData<Channel[]>(cacheKey)

    if (cached) {
      return NextResponse.json({ channels: cached })
    }

    // Get M3U sources from database
    const sources = await db.getAllSources()

    if (sources.length === 0) {
      return NextResponse.json({ channels: [] })
    }

    // Parse all M3U sources and combine channels
    const allChannels: Channel[] = []

    for (const source of sources) {
      try {
        const channels = await parseM3U(source.url)
        allChannels.push(...channels)
      } catch (error) {
        console.error(`[v0] Failed to parse M3U from ${source.name}:`, error)
      }
    }

    // Cache for 5 minutes
    await setCachedData(cacheKey, allChannels, 300)

    return NextResponse.json({ channels: allChannels })
  } catch (error) {
    console.error("[v0] Channels API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
