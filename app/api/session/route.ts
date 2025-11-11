import { type NextRequest, NextResponse } from "next/server"
import { generateToken } from "@/lib/security"
import { cookies } from "next/headers"

export async function POST(req: NextRequest) {
  try {
    const { key } = await req.json()

    const token = generateToken({ key }, 3600) // 1 hour

    const cookieStore = await cookies()
    cookieStore.set("session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 3600,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Session creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("session_token")

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    return NextResponse.json({ authenticated: true })
  } catch (error) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }
}
