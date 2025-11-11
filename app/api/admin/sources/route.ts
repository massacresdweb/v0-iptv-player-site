import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyToken } from "@/lib/security"
import { cookies } from "next/headers"
import { deleteCachedData } from "@/lib/redis"

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
    const sources = await db.getAllSources()
    return NextResponse.json({ sources })
  } catch (error) {
    console.error("[v0] Get sources error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { name, url } = await req.json()

    const source = await db.createSource(name, url)

    // Clear channels cache
    await deleteCachedData("channels:all")

    return NextResponse.json({ source })
  } catch (error) {
    console.error("[v0] Create source error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const sourceId = searchParams.get("id")

    if (!sourceId) {
      return NextResponse.json({ error: "Source ID required" }, { status: 400 })
    }

    await db.deleteSource(Number.parseInt(sourceId))

    // Clear channels cache
    await deleteCachedData("channels:all")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Delete source error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
