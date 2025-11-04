// Stream proxy to hide real M3U URLs
// Makes IPTV panel see only 1 user/1 channel

export function createProxyUrl(channelId: string, sessionToken: string): string {
  return `/api/stream/${channelId}?token=${sessionToken}`
}

export function obfuscateUserAgent(): string {
  // Random user agent to make all users look like 1 user
  return "VLC/3.0.18 LibVLC/3.0.18"
}

export async function proxyStream(realUrl: string, headers: Record<string, string> = {}) {
  const response = await fetch(realUrl, {
    headers: {
      "User-Agent": obfuscateUserAgent(),
      Referer: new URL(realUrl).origin,
      ...headers,
    },
  })

  return response
}
