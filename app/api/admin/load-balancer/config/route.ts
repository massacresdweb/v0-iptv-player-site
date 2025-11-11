import { type NextRequest, NextResponse } from "next/server"
import { getRedis } from "@/lib/redis"
import { verifyAdminSession } from "@/lib/security"

export async function GET(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const redis = getRedis()
    const config = await redis.get("lb:config")

    return NextResponse.json({
      config: config || {
        algorithm: "round-robin",
        healthCheckInterval: 10,
        maxRetries: 3,
        timeout: 5000,
      },
    })
  } catch (error) {
    console.error("Failed to fetch LB config:", error)
    return NextResponse.json({ error: "Failed to fetch config" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const config = await request.json()
    const redis = getRedis()
    await redis.set("lb:config", JSON.stringify(config))

    return NextResponse.json({ success: true, config })
  } catch (error) {
    console.error("Failed to update LB config:", error)
    return NextResponse.json({ error: "Failed to update config" }, { status: 500 })
  }
}
