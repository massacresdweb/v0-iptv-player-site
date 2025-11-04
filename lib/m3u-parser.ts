// Ultra-fast M3U parser with caching
// Parses M3U/M3U Plus formats

export interface Channel {
  id: string
  name: string
  logo?: string
  group?: string
  url: string
  type?: "live" | "movie" | "series"
}

export interface M3UStats {
  totalChannels: number
  liveChannels: number
  movies: number
  series: number
  groups: string[]
}

export async function parseM3U(content: string): Promise<Channel[]> {
  const channels: Channel[] = []
  const lines = content.split("\n")

  let currentChannel: Partial<Channel> = {}

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    if (line.startsWith("#EXTINF:")) {
      // Parse channel info
      const nameMatch = line.match(/,(.+)$/)
      const logoMatch = line.match(/tvg-logo="([^"]+)"/)
      const groupMatch = line.match(/group-title="([^"]+)"/)

      const name = nameMatch ? nameMatch[1].trim() : "Unknown"
      const group = groupMatch ? groupMatch[1] : "Genel"

      let type: "live" | "movie" | "series" = "live"
      const lowerName = name.toLowerCase()
      const lowerGroup = group.toLowerCase()

      if (lowerGroup.includes("film") || lowerGroup.includes("movie") || lowerName.includes("film")) {
        type = "movie"
      } else if (lowerGroup.includes("dizi") || lowerGroup.includes("series") || lowerGroup.includes("serie")) {
        type = "series"
      }

      currentChannel = {
        name,
        logo: logoMatch ? logoMatch[1] : undefined,
        group,
        type,
      }
    } else if (line && !line.startsWith("#") && currentChannel.name) {
      // This is the stream URL
      currentChannel.url = line
      currentChannel.id = crypto.randomUUID()

      channels.push(currentChannel as Channel)
      currentChannel = {}
    }
  }

  return channels
}

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

  stats.groups = Array.from(groupSet)

  return stats
}

export async function fetchAndParseM3U(url: string): Promise<Channel[]> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch M3U: ${response.statusText}`)
  }

  const content = await response.text()
  return parseM3U(content)
}
