import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdmin } from "@/lib/auth"
import { encryptM3U } from "@/lib/encryption"
import { deletePattern, getCached, setCached } from "@/lib/redis"
import { fetchAndParseM3U, analyzeM3U } from "@/lib/m3u-parser"

// Get all M3U sources
export async function GET() {
  try {
    await requireAdmin()

    const sources = await sql`
      SELECT id, name, is_active, created_at, updated_at 
      FROM m3u_sources 
      ORDER BY created_at DESC
    `

    // Fetch stats for each M3U source
    const sourcesWithStats = await Promise.all(
      sources.map(async (source) => {
        try {
          const statsKey = `m3u:${source.id}:stats`
          const cachedStats = await getCached(statsKey)

          if (cachedStats) {
            return { ...source, stats: JSON.parse(cachedStats) }
          }

          return { ...source, stats: null }
        } catch {
          return { ...source, stats: null }
        }
      }),
    )

    return NextResponse.json({ sources: sourcesWithStats })
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

// Add new M3U source
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const { name, url } = await request.json()

    if (!name || !url) {
      return NextResponse.json({ error: "Name ve URL gerekli" }, { status: 400 })
    }

    const { encrypted, iv } = encryptM3U(url)

    const result = await sql`
      INSERT INTO m3u_sources (name, encrypted_url, encryption_iv)
      VALUES (${name}, ${encrypted}, ${iv})
      RETURNING id, name, is_active, created_at
    `

    const sourceId = result[0].id

    // Analyze M3U content in background
    try {
      const channels = await fetchAndParseM3U(url)
      const stats = analyzeM3U(channels)

      // Cache stats
      const statsKey = `m3u:${sourceId}:stats`
      await setCached(statsKey, JSON.stringify(stats), 3600) // 1 hour cache

      return NextResponse.json({
        source: { ...result[0], stats },
      })
    } catch (error) {
      console.error("[v0] M3U analysis error:", error)
      return NextResponse.json({ source: result[0] })
    }
  } catch (error) {
    console.error("[v0] M3U add error:", error)
    return NextResponse.json({ error: "M3U eklenemedi" }, { status: 500 })
  }
}

// Delete M3U source
export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID gerekli" }, { status: 400 })
    }

    await sql`DELETE FROM m3u_sources WHERE id = ${id}`
    await deletePattern(`m3u:${id}:*`)

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
