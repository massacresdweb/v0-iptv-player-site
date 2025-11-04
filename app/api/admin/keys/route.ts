import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdmin } from "@/lib/auth"
import { generateKey } from "@/lib/encryption"

// Get all keys
export async function GET() {
  try {
    await requireAdmin()

    const keys = await sql`
      SELECT 
        uk.id, uk.key_code, uk.is_active, uk.max_connections, 
        uk.expires_at, uk.created_at, uk.last_used_at,
        m.name as m3u_name
      FROM user_keys uk
      LEFT JOIN m3u_sources m ON uk.m3u_source_id = m.id
      ORDER BY uk.created_at DESC
    `

    return NextResponse.json({ keys })
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

// Generate new key
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const { m3uSourceId, maxConnections = 1, expiresInDays } = await request.json()

    if (!m3uSourceId) {
      return NextResponse.json({ error: "M3U source ID gerekli" }, { status: 400 })
    }

    const keyCode = generateKey(16)
    const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 86400000) : null

    const result = await sql`
      INSERT INTO user_keys (key_code, m3u_source_id, max_connections, expires_at)
      VALUES (${keyCode}, ${m3uSourceId}, ${maxConnections}, ${expiresAt})
      RETURNING *
    `

    return NextResponse.json({ key: result[0] })
  } catch (error) {
    console.error("[v0] Key generation error:", error)
    return NextResponse.json({ error: "KEY oluşturulamadı" }, { status: 500 })
  }
}
