import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth"
import { getCached, setCached, deletePattern, CACHE_KEYS, CACHE_TTL } from "@/lib/redis"
import { z } from "zod"

const serverSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  username: z.string().optional(),
  password: z.string().optional(),
})

export async function GET() {
  try {
    const session = await requireAuth()

    const cacheKey = CACHE_KEYS.SERVERS(session.userId)
    const cached = await getCached<any[]>(cacheKey)

    if (cached) {
      return NextResponse.json({ servers: cached, cached: true })
    }

    const servers = await sql`
      SELECT id, name, url, username, is_active, last_synced_at, created_at
      FROM servers
      WHERE user_id = ${session.userId}
      ORDER BY created_at DESC
    `

    await setCached(cacheKey, servers, CACHE_TTL.SERVERS)

    return NextResponse.json({ servers, cached: false })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.error("Get servers error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const { name, url, username, password } = serverSchema.parse(body)

    const result = await sql`
      INSERT INTO servers (user_id, name, url, username, password, is_active)
      VALUES (${session.userId}, ${name}, ${url}, ${username || null}, ${password || null}, true)
      RETURNING id, name, url, username, is_active, created_at
    `

    await deletePattern(`servers:${session.userId}`)

    return NextResponse.json({ server: result[0] }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: error.errors }, { status: 400 })
    }

    console.error("Create server error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
