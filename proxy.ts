import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function proxy(request: NextRequest) {
  // Rate limiting for API routes
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const ip = request.ip || request.headers.get("x-forwarded-for") || "unknown"

    // Different limits for different endpoints
    let limit = 100
    let window = 60 // 60 seconds

    if (request.nextUrl.pathname.startsWith("/api/auth/")) {
      limit = 10 // Stricter for auth endpoints
      window = 60
    }

    try {
      const { checkRateLimit } = await import("@/lib/redis")
      const { allowed, remaining } = await checkRateLimit(`${ip}:${request.nextUrl.pathname}`, limit, window)

      if (!allowed) {
        return NextResponse.json(
          { error: "Too many requests" },
          {
            status: 429,
            headers: {
              "X-RateLimit-Limit": limit.toString(),
              "X-RateLimit-Remaining": "0",
              "Retry-After": window.toString(),
            },
          },
        )
      }

      const response = NextResponse.next()
      response.headers.set("X-RateLimit-Limit", limit.toString())
      response.headers.set("X-RateLimit-Remaining", remaining.toString())

      return response
    } catch (error) {
      // If Redis is not available, allow the request but log the error
      console.error("[v0] Rate limiting error:", error)
      return NextResponse.next()
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: "/api/:path*",
}
