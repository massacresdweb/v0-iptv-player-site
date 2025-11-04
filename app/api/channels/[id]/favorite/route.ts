import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth"
import { deletePattern } from "@/lib/redis"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    const { id } = await params

    // Verify channel belongs to user's server
    const channels = await sql`
      SELECT c.id, c.is_favorite, c.server_id
      FROM channels c
      INNER JOIN servers s ON c.server_id = s.id
      WHERE c.id = ${id} AND s.user_id = ${session.userId}
    `

    if (channels.length === 0) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 })
    }

    const channel = channels[0]
    const newFavoriteStatus = !channel.is_favorite

    await sql`
      UPDATE channels
      SET is_favorite = ${newFavoriteStatus}
      WHERE id = ${id}
    `

    await deletePattern(`channels:${channel.server_id}`)
    await deletePattern(`favorites:${session.userId}`)

    return NextResponse.json({ isFavorite: newFavoriteStatus })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.error("Toggle favorite error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
