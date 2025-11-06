import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getUserSession } from "@/lib/auth"
import { getCached, setCached, CACHE_KEYS, CACHE_TTL } from "@/lib/redis"
import { fetchAndParseM3U, type Channel } from "@/lib/m3u-parser"
import { fetchXtreamChannels, type XtreamCredentials } from "@/lib/xtream-parser"
import { decryptM3U } from "@/lib/encryption"

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] Channels API called")

    // Get user session
    const session = await getUserSession()
    if (!session) {
      console.log("[v0] No session found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Session found, key_code:", session.keyCode)

    // Validate KEY
    const keyResult = await sql`
      SELECT is_active, is_banned, expires_at 
      FROM user_keys 
      WHERE key_code = ${session.keyCode}
    `

    if (keyResult.length === 0) {
      console.log("[v0] KEY not found")
      return NextResponse.json({ error: "KEY not found" }, { status: 403 })
    }

    const key = keyResult[0]

    if (key.is_banned || !key.is_active) {
      console.log("[v0] KEY is banned or inactive")
      return NextResponse.json({ error: "KEY is not valid" }, { status: 403 })
    }

    if (key.expires_at && new Date(key.expires_at as string) < new Date()) {
      console.log("[v0] KEY expired")
      return NextResponse.json({ error: "KEY expired" }, { status: 403 })
    }

    // Get M3U source
    let m3uSourceId = session.m3uSourceId

    if (!m3uSourceId) {
      const m3uResult = await sql`
        SELECT id FROM m3u_sources WHERE is_active = true ORDER BY created_at DESC LIMIT 1
      `

      if (m3uResult.length === 0) {
        console.log("[v0] No active M3U sources")
        return NextResponse.json({ error: "No M3U sources available" }, { status: 404 })
      }

      m3uSourceId = m3uResult[0].id as number
    }

    console.log("[v0] Using M3U source ID:", m3uSourceId)

    // Check cache
    const channelsCacheKey = CACHE_KEYS.CHANNELS(m3uSourceId)
    let channels = await getCached<Channel[]>(channelsCacheKey)

    if (channels) {
      console.log("[v0] Channels loaded from cache:", channels.length)
      return NextResponse.json({ channels, cached: true })
    }

    console.log("[v0] Fetching M3U source from database...")
    const m3uResult = await sql`
      SELECT 
        encrypted_url, 
        encryption_iv
      FROM m3u_sources 
      WHERE id = ${m3uSourceId} AND is_active = true
    `

    if (m3uResult.length === 0) {
      console.log("[v0] M3U source not found")
      return NextResponse.json({ error: "M3U source not found" }, { status: 404 })
    }

    const source = m3uResult[0]

    console.log("[v0] Decrypting M3U URL...")

    const encryptedUrl = source.encrypted_url as string
    const iv = source.encryption_iv as string

    if (!encryptedUrl || !iv) {
      console.log("[v0] Missing encrypted URL or IV")
      return NextResponse.json({ error: "Invalid M3U source configuration" }, { status: 500 })
    }

    const decryptedContent = decryptM3U(encryptedUrl, iv)
    console.log("[v0] Content decrypted, checking type...")

    let isXtream = false
    try {
      const parsed = JSON.parse(decryptedContent)
      if (parsed.server && parsed.username && parsed.password) {
        isXtream = true
        console.log("[v0] Detected Xtream Codes credentials")
      }
    } catch {
      // Not JSON, treat as M3U URL
      console.log("[v0] Detected M3U URL")
    }

    if (isXtream) {
      const credentials: XtreamCredentials = JSON.parse(decryptedContent)
      console.log("[v0] Fetching channels from Xtream API...")
      channels = await fetchXtreamChannels(credentials)
      console.log("[v0] Xtream channels fetched:", channels.length)
    } else {
      console.log("[v0] Fetching channels from M3U URL...")
      channels = await fetchAndParseM3U(decryptedContent)
      console.log("[v0] M3U channels fetched:", channels.length)
    }

    const mappedChannels = channels.map((ch) => ({
      id: ch.id,
      name: ch.name,
      url: ch.url,
      logo: ch.logo,
      group: ch.group,
      epgId: ch.epgId,
      category: ch.type || "live", // Ensure category is always set
      type: ch.type,
      is_favorite: false, // Default to false, will be updated by user
    }))

    console.log("[v0] === CHANNEL MAPPING DEBUG ===")
    console.log("[v0] Total channels:", mappedChannels.length)
    console.log("[v0] Sample channel (first):", JSON.stringify(mappedChannels[0], null, 2))
    console.log("[v0] Live channels:", mappedChannels.filter((ch) => ch.category === "live").length)
    console.log("[v0] Movie channels:", mappedChannels.filter((ch) => ch.category === "movie").length)
    console.log("[v0] Series channels:", mappedChannels.filter((ch) => ch.category === "series").length)
    console.log("[v0] Channels without category:", mappedChannels.filter((ch) => !ch.category).length)

    // Cache for 1 hour
    await setCached(channelsCacheKey, mappedChannels, CACHE_TTL.CHANNELS)

    return NextResponse.json({ channels: mappedChannels, cached: false })
  } catch (error) {
    console.error("[v0] Channels API error:", error)
    return NextResponse.json(
      {
        error: "Kanallar yüklenemedi",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
