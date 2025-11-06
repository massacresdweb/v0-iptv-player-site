import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { createAdminSession, getAdminSession } from "@/lib/auth"
import type { Admin } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    console.log("[v0] Admin login attempt:", { username })

    if (!username || !password) {
      return NextResponse.json({ error: "Username ve password gerekli" }, { status: 400 })
    }

    const adminCount = await sql`SELECT COUNT(*) as count FROM admins`
    const count = Number(adminCount[0].count)

    if (count === 0 && username === "massacresd" && password === "Massacresd2025@") {
      console.log("[v0] No admin exists, creating first admin...")
      const passwordHash = "$2a$10$5P8paKWdlhncm2hM92om9.Tz0R/1S/CN/QpP4m/t5.xDbrzmEa5BK"

      await sql`
        INSERT INTO admins (username, password_hash, created_at)
        VALUES (${username}, ${passwordHash}, NOW())
      `
      console.log("[v0] First admin created successfully")
    }

    const result = await sql`
      SELECT * FROM admins WHERE username = ${username} LIMIT 1
    `

    console.log("[v0] Admin query result:", result.length > 0 ? "User found" : "User not found")

    const admin = result[0] as Admin | undefined

    if (!admin) {
      console.log("[v0] Admin not found in database")
      return NextResponse.json({ error: "Geçersiz kullanıcı adı veya şifre" }, { status: 401 })
    }

    console.log("[v0] Comparing password with hash...")
    console.log("[v0] Password length:", password.length)
    console.log("[v0] Hash starts with:", admin.password_hash.substring(0, 10))

    const passwordValid = await bcrypt.compare(password, admin.password_hash)
    console.log("[v0] Password verification result:", passwordValid)

    if (!passwordValid) {
      return NextResponse.json({ error: "Geçersiz kullanıcı adı veya şifre" }, { status: 401 })
    }

    await createAdminSession(admin)
    console.log("[v0] Admin session created successfully")

    return NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        username: admin.username,
      },
    })
  } catch (error) {
    console.error("[v0] Admin login error:", error)
    return NextResponse.json({ error: "Giriş başarısız: " + (error as Error).message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const admin = await getAdminSession()

    if (!admin) {
      console.log("[v0] No admin session found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Admin session valid:", admin.username)
    return NextResponse.json({ success: true, admin: { id: admin.adminId, username: admin.username } })
  } catch (error) {
    console.error("[v0] Admin session check error:", error)
    return NextResponse.json({ error: "Session check failed" }, { status: 500 })
  }
}
