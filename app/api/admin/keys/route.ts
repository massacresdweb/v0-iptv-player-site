import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdmin } from "@/lib/auth"
import { generateKey } from "@/lib/encryption"

export async function GET() {
  try {
    await requireAdmin()

    const keys = await sql`
      SELECT 
        uk.id, 
        uk.key_code as key_value,
        uk.is_active, 
        uk.is_banned,
        uk.max_connections, 
        uk.expires_at, 
        uk.created_at, 
        uk.last_used_at,
        m.name as m3u_name
      FROM user_keys uk
      LEFT JOIN m3u_sources m ON uk.m3u_source_id = m.id
      ORDER BY uk.created_at DESC
    `

    return NextResponse.json({ keys })
  } catch (error) {
    console.error("[v0] Keys GET error:", error)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const { m3uSourceId, durationDays } = await request.json()

    if (!m3uSourceId) {
      return NextResponse.json({ error: "M3U source ID gerekli" }, { status: 400 })
    }

    const keyCode = generateKey(16)
    const expiresAt = durationDays ? new Date(Date.now() + durationDays * 86400000) : null

    const result = await sql`
      INSERT INTO user_keys (key_code, m3u_source_id, expires_at)
      VALUES (${keyCode}, ${m3uSourceId}, ${expiresAt})
      RETURNING id, key_code as key_value, m3u_source_id, is_active, is_banned, expires_at, created_at
    `

    return NextResponse.json({ key: keyCode, data: result[0] })
  } catch (error) {
    console.error("[v0] Key generation error:", error)
    return NextResponse.json({ error: "KEY oluşturulamadı" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin()

    const { keyId, isBanned } = await request.json()

    if (!keyId) {
      return NextResponse.json({ error: "Key ID gerekli" }, { status: 400 })
    }

    await sql`
      UPDATE user_keys 
      SET is_banned = ${isBanned}
      WHERE id = ${keyId}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Key ban error:", error)
    return NextResponse.json({ error: "İşlem başarısız" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const keyId = searchParams.get("keyId")

    if (!keyId) {
      return NextResponse.json({ error: "Key ID gerekli" }, { status: 400 })
    }

    await sql`DELETE FROM user_keys WHERE id = ${keyId}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Key delete error:", error)
    return NextResponse.json({ error: "Silme başarısız" }, { status: 500 })
  }
}
