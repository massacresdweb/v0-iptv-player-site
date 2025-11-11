import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const { key } = await req.json()

    if (!key) {
      return NextResponse.json({ error: "Key is required" }, { status: 400 })
    }

    const userKey = await db.validateKey(key)

    if (!userKey) {
      return NextResponse.json({ error: "Invalid or expired key" }, { status: 401 })
    }

    return NextResponse.json({
      valid: true,
      key: userKey,
    })
  } catch (error) {
    console.error("[v0] Validate key error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
