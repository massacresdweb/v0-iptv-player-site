import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyToken } from "@/lib/security"
import { cookies } from "next/headers"

async function verifyAdmin(req: NextRequest): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get("admin_token")

  if (!token) return false

  const verified = verifyToken(token.value)
  return verified !== null
}

export async function GET(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const servers = await db.getAllServers()
    return NextResponse.json({ servers })
  } catch (error) {
    console.error("[v0] Get servers error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { name, host, sshUser, sshKey } = await req.json()

    const server = await db.createServer(name, host, sshUser, sshKey)

    return NextResponse.json({ server })
  } catch (error) {
    console.error("[v0] Create server error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const serverId = searchParams.get("id")

    if (!serverId) {
      return NextResponse.json({ error: "Server ID required" }, { status: 400 })
    }

    await db.deleteServer(Number.parseInt(serverId))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Delete server error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
