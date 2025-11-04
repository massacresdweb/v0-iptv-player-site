import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdmin } from "@/lib/auth"

export async function GET() {
  try {
    await requireAdmin()

    const [usersResult, serversResult, channelsResult] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM users`,
      sql`SELECT COUNT(*) as count FROM servers`,
      sql`SELECT COUNT(*) as count FROM channels`,
    ])

    return NextResponse.json({
      totalUsers: Number.parseInt(usersResult[0].count),
      totalServers: Number.parseInt(serversResult[0].count),
      totalChannels: Number.parseInt(channelsResult[0].count),
      activeUsers: 0, // This would require session tracking
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.error("Get stats error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
