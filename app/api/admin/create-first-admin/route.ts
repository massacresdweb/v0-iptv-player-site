import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import bcrypt from "bcryptjs"

// Bu endpoint sadece ilk admin'i oluşturmak için kullanılır
// Admin oluşturduktan sonra bu dosyayı silin!
export async function POST() {
  try {
    // Önce admin var mı kontrol et
    const existingAdmins = await sql`SELECT COUNT(*) as count FROM admins`

    if (existingAdmins[0].count > 0) {
      return NextResponse.json(
        {
          error: "Admin zaten var. Bu endpoint'i silebilirsiniz.",
        },
        { status: 400 },
      )
    }

    const password = "Massacresd2025@"
    const passwordHash = await bcrypt.hash(password, 10)

    console.log("[v0] Creating admin with fresh hash...")
    console.log("[v0] New hash:", passwordHash)

    // Admin kullanıcısını oluştur
    await sql`
      INSERT INTO admins (username, password_hash, created_at)
      VALUES (
        'massacresd',
        ${passwordHash},
        NOW()
      )
    `

    console.log("[v0] First admin created successfully")

    return NextResponse.json({
      success: true,
      message: "Admin başarıyla oluşturuldu. Şimdi giriş yapabilirsiniz.",
      credentials: {
        username: "massacresd",
        password: "Massacresd2025@",
      },
    })
  } catch (error) {
    console.error("[v0] Admin creation error:", error)
    return NextResponse.json(
      {
        error: "Admin oluşturulamadı: " + (error as Error).message,
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Admin oluşturmak için POST request gönderin",
    endpoint: "/api/admin/create-first-admin",
  })
}
