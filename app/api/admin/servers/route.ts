import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verifyAdminToken } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("admin_token")?.value
    if (!token || !verifyAdminToken(token)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const servers = await sql`
      SELECT id, name, url, location, is_active, created_at
      FROM servers
      ORDER BY created_at DESC
    `

    return NextResponse.json({ servers })
  } catch (error) {
    console.error("[v0] GET /api/admin/servers error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("admin_token")?.value
    if (!token || !verifyAdminToken(token)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, url, location } = await request.json()

    if (!name || !url) {
      return NextResponse.json({ error: "Name and URL required" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO servers (name, url, location, is_active)
      VALUES (${name}, ${url}, ${location || "Unknown"}, true)
      RETURNING id, name, url, location
    `

    return NextResponse.json({ server: result[0] })
  } catch (error) {
    console.error("[v0] POST /api/admin/servers error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get("admin_token")?.value
    if (!token || !verifyAdminToken(token)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const serverId = searchParams.get("serverId")

    if (!serverId) {
      return NextResponse.json({ error: "Server ID required" }, { status: 400 })
    }

    await sql`DELETE FROM servers WHERE id = ${serverId}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] DELETE /api/admin/servers error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
