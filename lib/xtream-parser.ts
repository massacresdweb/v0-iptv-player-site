import { randomUUID } from "crypto"
import type { Channel } from "./m3u-parser"

export interface XtreamCredentials {
  server: string
  username: string
  password: string
  port?: number
}

export interface XtreamStats {
  totalChannels: number
  liveChannels: number
  movies: number
  series: number
  groups: string[]
}

/**
 * Validate Xtream Codes credentials
 */
export async function validateXtreamCredentials(credentials: XtreamCredentials): Promise<boolean> {
  try {
    const { server, username, password, port = 80 } = credentials
    const baseUrl = `${server}:${port}`

    console.log("[v0] Validating Xtream credentials...")

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(`${baseUrl}/player_api.php?username=${username}&password=${password}`, {
      signal: controller.signal,
      headers: { "User-Agent": "MASSTV/1.0" },
    })

    clearTimeout(timeout)

    if (!response.ok) {
      console.error("[v0] Xtream validation failed:", response.status)
      return false
    }

    const data = await response.json()
    return data.user_info && data.user_info.auth === 1
  } catch (error) {
    console.error("[v0] Xtream validation error:", error)
    return false
  }
}

/**
 * Fetch all Xtream content and convert to Channel format
 */
export async function fetchXtreamChannels(credentials: XtreamCredentials, maxChannels = 5000): Promise<Channel[]> {
  const { server, username, password, port = 80 } = credentials
  const baseUrl = `${server}:${port}`

  console.log("[v0] Fetching Xtream content, max channels:", maxChannels)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60000) // 60 second timeout

  try {
    // Fetch all content types in parallel
    const [liveResponse, vodResponse, seriesResponse] = await Promise.allSettled([
      fetch(`${baseUrl}/player_api.php?username=${username}&password=${password}&action=get_live_streams`, {
        signal: controller.signal,
        headers: { "User-Agent": "MASSTV/1.0" },
      }),
      fetch(`${baseUrl}/player_api.php?username=${username}&password=${password}&action=get_vod_streams`, {
        signal: controller.signal,
        headers: { "User-Agent": "MASSTV/1.0" },
      }),
      fetch(`${baseUrl}/player_api.php?username=${username}&password=${password}&action=get_series`, {
        signal: controller.signal,
        headers: { "User-Agent": "MASSTV/1.0" },
      }),
    ])

    clearTimeout(timeout)

    const channels: Channel[] = []

    // Process live streams
    if (liveResponse.status === "fulfilled" && liveResponse.value.ok) {
      const liveData = await liveResponse.value.json()
      console.log("[v0] Fetched live streams:", liveData.length)

      const limitedLive = liveData.slice(0, Math.floor(maxChannels * 0.5))
      limitedLive.forEach((stream: any) => {
        channels.push({
          id: randomUUID(),
          name: stream.name || "Unknown",
          logo: stream.stream_icon || undefined,
          group: stream.category_name || "Live TV",
          url: `${baseUrl}/live/${username}/${password}/${stream.stream_id}.m3u8`,
          type: "live",
          epgId: stream.epg_channel_id || undefined,
        })
      })
      console.log("[v0] Added live channels:", channels.length)
    }

    // Process VOD (movies)
    if (vodResponse.status === "fulfilled" && vodResponse.value.ok && channels.length < maxChannels) {
      const vodData = await vodResponse.value.json()
      console.log("[v0] Fetched VOD streams:", vodData.length)

      const remaining = maxChannels - channels.length
      const limitedVod = vodData.slice(0, Math.floor(remaining * 0.5))
      limitedVod.forEach((stream: any) => {
        channels.push({
          id: randomUUID(),
          name: stream.name || "Unknown",
          logo: stream.stream_icon || undefined,
          group: stream.category_name || "Movies",
          url: `${baseUrl}/movie/${username}/${password}/${stream.stream_id}.${stream.container_extension || "mp4"}`,
          type: "movie",
        })
      })
      console.log("[v0] Added VOD channels, total:", channels.length)
    }

    // Process series
    if (seriesResponse.status === "fulfilled" && seriesResponse.value.ok && channels.length < maxChannels) {
      const seriesData = await seriesResponse.value.json()
      console.log("[v0] Fetched series:", seriesData.length)

      const remaining = maxChannels - channels.length
      const limitedSeries = seriesData.slice(0, remaining)
      limitedSeries.forEach((series: any) => {
        channels.push({
          id: randomUUID(),
          name: series.name || "Unknown",
          logo: series.cover || undefined,
          group: series.category_name || "Series",
          url: `${baseUrl}/series/${username}/${password}/${series.series_id}.${series.container_extension || "mp4"}`,
          type: "series",
        })
      })
      console.log("[v0] Added series, total:", channels.length)
    }

    console.log("[v0] Total Xtream channels (limited):", channels.length)
    return channels
  } catch (error) {
    clearTimeout(timeout)
    console.error("[v0] Xtream fetch error:", error)
    throw new Error(`Xtream fetch failed: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

/**
 * Analyze Xtream content and generate statistics
 */
export async function analyzeXtreamContent(credentials: XtreamCredentials): Promise<XtreamStats> {
  console.log("[v0] Analyzing Xtream content...")

  const channels = await fetchXtreamChannels(credentials)

  const stats: XtreamStats = {
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

  console.log("[v0] Xtream analysis:", stats)
  return stats
}
