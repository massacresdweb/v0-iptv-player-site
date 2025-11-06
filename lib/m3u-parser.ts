import { randomUUID } from "crypto"

export interface Channel {
  id: string
  name: string
  logo?: string
  group?: string
  url: string
  type: "live" | "movie" | "series"
  epgId?: string
}

export interface M3UStats {
  totalChannels: number
  liveChannels: number
  movies: number
  series: number
  groups: string[]
}

/**
 * Detects channel type based on multiple signals
 */
function detectChannelType(name: string, group: string, url: string): "live" | "movie" | "series" {
  const lowerName = name.toLowerCase()
  const lowerGroup = group.toLowerCase()
  const lowerUrl = url.toLowerCase()

  // Series detection (highest priority)
  const seriesPatterns = [
    /s\d{1,2}e\d{1,2}/i, // S01E01, S1E1
    /season\s*\d+/i, // Season 1
    /sezon\s*\d+/i, // Sezon 1
    /bölüm\s*\d+/i, // Bölüm 1
    /episode\s*\d+/i, // Episode 1
  ]

  const seriesKeywords = ["dizi", "series", "serie", "tv show", "tvshow"]
  const seriesUrlPatterns = ["/series/", "/serie/", "/tvshow/"]

  const hasSeries =
    seriesPatterns.some((pattern) => pattern.test(lowerName)) ||
    seriesKeywords.some((keyword) => lowerGroup.includes(keyword) || lowerName.includes(keyword)) ||
    seriesUrlPatterns.some((pattern) => lowerUrl.includes(pattern))

  if (hasSeries) return "series"

  // Movie detection (medium priority)
  const movieKeywords = ["film", "movie", "cinema", "sinema"]
  const movieUrlPatterns = ["/movie/", "/film/", "/vod/"]

  const hasMovie =
    movieKeywords.some((keyword) => lowerGroup.includes(keyword) || lowerName.includes(keyword)) ||
    movieUrlPatterns.some((pattern) => lowerUrl.includes(pattern))

  if (hasMovie) return "movie"

  // Default to live
  return "live"
}

/**
 * Parse M3U content and extract channels
 */
export async function parseM3U(content: string, maxChannels = 5000): Promise<Channel[]> {
  console.log("[v0] Parsing M3U content, length:", content.length, "max channels:", maxChannels)

  const channels: Channel[] = []
  const lines = content.split("\n")

  let currentChannel: Partial<Channel> = {}

  for (let i = 0; i < lines.length; i++) {
    if (channels.length >= maxChannels) {
      console.log("[v0] Reached max channel limit:", maxChannels, "- stopping parse")
      break
    }

    const line = lines[i].trim()

    if (line.startsWith("#EXTINF:")) {
      // Parse EXTINF line
      const nameMatch = line.match(/,(.+)$/)
      const logoMatch = line.match(/tvg-logo="([^"]+)"/)
      const groupMatch = line.match(/group-title="([^"]+)"/)
      const epgMatch = line.match(/tvg-id="([^"]+)"/)

      currentChannel = {
        name: nameMatch ? nameMatch[1].trim() : "Unknown Channel",
        logo: logoMatch ? logoMatch[1] : undefined,
        group: groupMatch ? groupMatch[1] : "Genel",
        epgId: epgMatch ? epgMatch[1] : undefined,
      }
    } else if (line && !line.startsWith("#") && currentChannel.name) {
      // This is the stream URL
      let url = line.trim()

      // Detect channel type
      const type = detectChannelType(currentChannel.name, currentChannel.group || "", url)

      if (type === "live" && !url.match(/\.(m3u8|ts|mp4|mkv|avi|flv)$/i)) {
        url = `${url}.m3u8`
        console.log("[v0] Added .m3u8 extension to live stream URL")
      }

      const channel: Channel = {
        id: randomUUID(),
        name: currentChannel.name,
        logo: currentChannel.logo,
        group: currentChannel.group,
        url,
        type,
        epgId: currentChannel.epgId,
      }

      channels.push(channel)
      currentChannel = {}
    }
  }

  console.log("[v0] M3U parsing complete, channels:", channels.length)
  return channels
}

/**
 * Analyze M3U channels and generate statistics
 */
export function analyzeM3U(channels: Channel[]): M3UStats {
  const stats: M3UStats = {
    totalChannels: channels.length,
    liveChannels: 0,
    movies: 0,
    series: 0,
    groups: [],
  }

  const groupSet = new Set<string>()

  channels.forEach((channel) => {
    if (channel.type === "live") stats.liveChannels++
    else if (channel.type === "movie") stats.movies++
    else if (channel.type === "series") stats.series++

    if (channel.group) groupSet.add(channel.group)
  })

  stats.groups = Array.from(groupSet).sort()

  console.log("[v0] M3U analysis:", stats)
  return stats
}

/**
 * Fetch M3U from URL and parse it
 */
export async function fetchAndParseM3U(url: string, maxChannels = 5000): Promise<Channel[]> {
  console.log("[v0] Fetching M3U from URL:", url.substring(0, 50) + "...", "max channels:", maxChannels)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000) // 30 second timeout

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "VLC/3.0.18 LibVLC/3.0.18",
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        Connection: "keep-alive",
      },
    })

    clearTimeout(timeout)

    if (!response.ok) {
      if (response.status === 451) {
        throw new Error(`M3U URL yasal nedenlerle engellenmiş. Lütfen başka bir kaynak deneyin.`)
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const content = await response.text()
    console.log("[v0] M3U fetched, size:", content.length, "bytes")

    if (!content.includes("#EXTM3U") && !content.includes("#EXTINF")) {
      throw new Error("Geçersiz M3U formatı. Dosya M3U playlist değil.")
    }

    return parseM3U(content, maxChannels)
  } catch (error) {
    clearTimeout(timeout)
    console.error("[v0] M3U fetch error:", error)
    throw new Error(`M3U fetch failed: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}
