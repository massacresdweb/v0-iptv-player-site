import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { generateToken } from "@/lib/security"
import { cookies } from "next/headers"

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()

    const admin = await db.getAdmin(username)

    if (!admin) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const validPassword = await bcrypt.compare(password, admin.password)

    if (!validPassword) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const token = generateToken({ adminId: admin.id, username: admin.username }, 28800) // 8 hours

    const cookieStore = await cookies()
    cookieStore.set("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 28800,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Admin login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
