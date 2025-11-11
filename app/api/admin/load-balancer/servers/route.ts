import { type NextRequest, NextResponse } from "next/server"
import { getDB } from "@/lib/db"
import { verifyAdminSession } from "@/lib/security"

export async function GET(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = getDB()
    const result = await db.query(`
      SELECT id, name, url, weight, enabled, latency, last_check, created_at
      FROM load_balancer_servers
      ORDER BY weight DESC, name ASC
    `)

    return NextResponse.json({ servers: result.rows })
  } catch (error) {
    console.error("Failed to fetch LB servers:", error)
    return NextResponse.json({ error: "Failed to fetch servers" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, url, weight = 1, enabled = true } = await request.json()

    if (!name || !url) {
      return NextResponse.json({ error: "Name and URL required" }, { status: 400 })
    }

    const db = getDB()
    const result = await db.query(
      `INSERT INTO load_balancer_servers (name, url, weight, enabled)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, url, weight, enabled`,
      [name, url, weight, enabled],
    )

    return NextResponse.json({ server: result.rows[0] })
  } catch (error) {
    console.error("Failed to add LB server:", error)
    return NextResponse.json({ error: "Failed to add server" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Server ID required" }, { status: 400 })
    }

    const db = getDB()
    await db.query("DELETE FROM load_balancer_servers WHERE id = $1", [id])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete LB server:", error)
    return NextResponse.json({ error: "Failed to delete server" }, { status: 500 })
  }
}
