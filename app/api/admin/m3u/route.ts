import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdmin } from "@/lib/auth"
import { encryptM3U } from "@/lib/encryption"
import { deletePattern, setCached } from "@/lib/redis"
import { fetchAndParseM3U, analyzeM3U } from "@/lib/m3u-parser"
import { validateXtreamCredentials, analyzeXtreamContent, type XtreamCredentials } from "@/lib/xtream-parser"

// Get all M3U sources
export async function GET() {
  try {
    await requireAdmin()

    let sources
    try {
      sources = await sql`
        SELECT 
          id, 
          name,
          source_type,
          is_active, 
          live_channels,
          movies,
          series,
          (live_channels + movies + series) as total_channels,
          created_at, 
          updated_at 
        FROM m3u_sources 
        ORDER BY created_at DESC
      `
    } catch (error) {
      // If source_type column doesn't exist, use backward compatible query
      console.log("[v0] source_type column not found, using backward compatible query")
      sources = await sql`
        SELECT 
          id, 
          name,
          'm3u' as source_type,
          is_active, 
          live_channels,
          movies,
          series,
          (live_channels + movies + series) as total_channels,
          created_at, 
          updated_at 
        FROM m3u_sources 
        ORDER BY created_at DESC
      `
    }

    // Format stats for frontend
    const sourcesWithStats = sources.map((source) => ({
      ...source,
      stats: {
        liveChannels: source.live_channels || 0,
        movies: source.movies || 0,
        series: source.series || 0,
        totalChannels: source.total_channels || 0,
      },
    }))

    return NextResponse.json({ sources: sourcesWithStats })
  } catch (error) {
    console.error("[v0] M3U GET error:", error)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

// Add new M3U source
export async function POST(request: NextRequest) {
  try {
    console.log("[v0] M3U/Xtream POST request received")

    try {
      await requireAdmin()
      console.log("[v0] Admin auth successful")
    } catch (authError) {
      console.error("[v0] Admin auth failed:", authError)
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 })
    }

    const body = await request.json()
    console.log("[v0] Request body:", { ...body, password: body.password ? "***" : undefined })

    const { name, url, sourceType, xtreamServer, xtreamUsername, xtreamPassword, xtreamPort } = body

    if (!name) {
      return NextResponse.json({ error: "İsim gerekli" }, { status: 400 })
    }

    if (sourceType === "xtream") {
      // Xtream Codes flow
      if (!xtreamServer || !xtreamUsername || !xtreamPassword) {
        return NextResponse.json({ error: "Xtream Codes için server, kullanıcı adı ve şifre gerekli" }, { status: 400 })
      }

      const credentials: XtreamCredentials = {
        server: xtreamServer,
        username: xtreamUsername,
        password: xtreamPassword,
        port: xtreamPort || 80,
      }

      console.log("[v0] Validating Xtream credentials...")
      const isValid = await validateXtreamCredentials(credentials)

      if (!isValid) {
        return NextResponse.json({ error: "Geçersiz Xtream Codes bilgileri" }, { status: 400 })
      }

      console.log("[v0] Xtream credentials valid, inserting into database...")

      // Encrypt credentials
      const credentialsJson = JSON.stringify(credentials)
      const { encrypted, iv } = encryptM3U(credentialsJson)

      const result = await sql`
        INSERT INTO m3u_sources (
          name, 
          source_type,
          encrypted_url, 
          encryption_iv,
          xtream_server,
          xtream_username,
          xtream_password,
          xtream_port
        )
        VALUES (
          ${name}, 
          'xtream',
          ${encrypted}, 
          ${iv},
          ${xtreamServer},
          ${xtreamUsername},
          ${xtreamPassword},
          ${xtreamPort || 80}
        )
        RETURNING id, name, source_type, is_active, created_at
      `

      console.log("[v0] Xtream source inserted:", result[0])
      const sourceId = result[0].id

      // Analyze Xtream content in background
      try {
        console.log("[v0] Starting Xtream analysis...")
        const stats = await analyzeXtreamContent(credentials)
        console.log("[v0] Xtream stats:", stats)

        // Update database with stats
        await sql`
          UPDATE m3u_sources 
          SET 
            live_channels = ${stats.liveChannels},
            movies = ${stats.movies},
            series = ${stats.series},
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ${sourceId}
        `
        console.log("[v0] Xtream stats saved to database")

        // Cache for faster access
        const statsKey = `m3u:${sourceId}:stats`
        await setCached(statsKey, JSON.stringify(stats), 3600)

        return NextResponse.json({
          source: { ...result[0], stats },
        })
      } catch (error) {
        console.error("[v0] Xtream analysis error:", error)
        return NextResponse.json({
          source: result[0],
          warning:
            "Xtream eklendi ancak analiz başarısız oldu: " +
            (error instanceof Error ? error.message : "Bilinmeyen hata"),
        })
      }
    } else {
      // M3U flow (existing code)
      if (!url) {
        return NextResponse.json({ error: "M3U URL gerekli" }, { status: 400 })
      }

      console.log("[v0] Checking for duplicate M3U URL...")
      const { encrypted: tempEncrypted } = encryptM3U(url)
      const existingSource = await sql`
        SELECT id, name FROM m3u_sources WHERE encrypted_url = ${tempEncrypted}
      `

      if (existingSource.length > 0) {
        console.log("[v0] Duplicate M3U URL found:", existingSource[0])
        return NextResponse.json({ error: `Bu M3U URL'si zaten mevcut: ${existingSource[0].name}` }, { status: 400 })
      }

      console.log("[v0] Encrypting M3U URL...")
      const { encrypted, iv } = encryptM3U(url)

      console.log("[v0] Inserting M3U source into database...")
      const result = await sql`
        INSERT INTO m3u_sources (name, source_type, encrypted_url, encryption_iv)
        VALUES (${name}, 'm3u', ${encrypted}, ${iv})
        RETURNING id, name, source_type, is_active, created_at
      `
      console.log("[v0] M3U source inserted:", result[0])

      const sourceId = result[0].id

      // Analyze M3U content in background
      try {
        console.log("[v0] Starting M3U analysis...")
        const channels = await fetchAndParseM3U(url)
        console.log("[v0] M3U parsed, channel count:", channels.length)

        const stats = analyzeM3U(channels)
        console.log("[v0] M3U stats:", stats)

        const totalCalculated = stats.liveChannels + stats.movies + stats.series
        if (totalCalculated !== stats.totalChannels) {
          console.warn("[v0] Stats mismatch! Calculated:", totalCalculated, "vs Reported:", stats.totalChannels)
          stats.totalChannels = totalCalculated
        }

        // Update database with stats
        await sql`
          UPDATE m3u_sources 
          SET 
            live_channels = ${stats.liveChannels},
            movies = ${stats.movies},
            series = ${stats.series},
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ${sourceId}
        `
        console.log("[v0] M3U stats saved to database")

        // Cache for faster access
        const statsKey = `m3u:${sourceId}:stats`
        await setCached(statsKey, JSON.stringify(stats), 3600)

        return NextResponse.json({
          source: { ...result[0], stats },
        })
      } catch (error) {
        console.error("[v0] M3U analysis error:", error)
        return NextResponse.json({
          source: result[0],
          warning:
            "M3U eklendi ancak analiz başarısız oldu: " + (error instanceof Error ? error.message : "Bilinmeyen hata"),
        })
      }
    }
  } catch (error) {
    console.error("[v0] Source add error:", error)
    return NextResponse.json(
      {
        error: "Kaynak eklenemedi: " + (error instanceof Error ? error.message : "Bilinmeyen hata"),
      },
      { status: 500 },
    )
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
