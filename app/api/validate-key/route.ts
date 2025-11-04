import { type NextRequest, NextResponse } from "next/server"
import { validateKey, createUserSession } from "@/lib/auth"
import { checkRateLimit } from "@/lib/redis"

export async function POST(request: NextRequest) {
  try {
    const { keyCode } = await request.json()

    if (!keyCode) {
      return NextResponse.json({ error: "KEY gerekli" }, { status: 400 })
    }

    // Rate limiting
    const ip = request.headers.get("x-forwarded-for") || "unknown"
    const { allowed } = await checkRateLimit(`key-validate:${ip}`, 10, 60)

    if (!allowed) {
      return NextResponse.json({ error: "Çok fazla deneme. Lütfen bekleyin." }, { status: 429 })
    }

    const key = await validateKey(keyCode.toUpperCase())

    if (!key) {
      return NextResponse.json({ error: "Geçersiz veya süresi dolmuş KEY" }, { status: 401 })
    }

    const sessionToken = await createUserSession(key.key_code, key.m3u_source_id)

    return NextResponse.json({
      success: true,
      sessionToken,
      m3uSourceId: key.m3u_source_id,
    })
  } catch (error) {
    console.error("[v0] Key validation error:", error)
    return NextResponse.json({ error: "Doğrulama başarısız" }, { status: 500 })
  }
}
