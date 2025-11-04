import { neon } from "@neondatabase/serverless"

let sqlClient: ReturnType<typeof neon> | null = null

export function getDb() {
  if (!sqlClient) {
    const dbUrl = process.env.NEON_NEON_DATABASE_URL || process.env.DATABASE_URL
    if (!dbUrl) {
      console.warn("[v0] DATABASE_URL not set, database operations will fail at runtime")
      return new Proxy({} as ReturnType<typeof neon>, {
        apply() {
          throw new Error("DATABASE_URL environment variable is not set")
        },
      })
    }
    sqlClient = neon(dbUrl)
  }
  return sqlClient
}

// Export sql for direct usage
export const sql = new Proxy({} as ReturnType<typeof neon>, {
  get(target, prop) {
    return getDb()[prop as keyof ReturnType<typeof neon>]
  },
  apply(target, thisArg, args) {
    return getDb()(...(args as [any]))
  },
})

export interface User {
  id: number
  username: string
  email: string
  password_hash: string
  role: "admin" | "user" | "moderator"
  is_active: boolean
  max_devices: number
  subscription_expires: Date | null
  created_at: Date
  updated_at: Date
  last_login: Date | null
  ip_whitelist: string[] | null
  hwid: string | null
  api_key: string
}

export interface Session {
  id: number
  user_id: number
  token: string
  device_id: string
  ip_address: string
  user_agent: string | null
  expires_at: Date
  created_at: Date
  last_activity: Date
}

export interface Server {
  id: number
  name: string
  url: string
  priority: number
  max_connections: number
  current_connections: number
  is_active: boolean
  health_status: "healthy" | "degraded" | "down"
  response_time_ms: number
  last_health_check: Date | null
  created_at: Date
}

export interface Channel {
  id: number
  name: string
  logo_url: string | null
  stream_url: string
  category: string | null
  language: string
  is_active: boolean
  quality: "SD" | "HD" | "FHD" | "4K" | "8K"
  epg_id: string | null
  sort_order: number
  created_at: Date
}

export interface UserFavorite {
  id: number
  user_id: number
  channel_id: number
  created_at: Date
}

export interface ActivityLog {
  id: number
  user_id: number | null
  action: string
  ip_address: string | null
  user_agent: string | null
  details: Record<string, any> | null
  created_at: Date
}

export interface Admin {
  id: number
  username: string
  password_hash: string
  created_at: Date
}

export interface M3USource {
  id: number
  name: string
  encrypted_url: string
  encryption_iv: string
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface UserKey {
  id: number
  key_code: string
  m3u_source_id: number
  is_active: boolean
  max_connections: number
  expires_at: Date | null
  created_at: Date
  last_used_at: Date | null
}

export interface ActiveSession {
  id: number
  key_code: string
  session_token: string
  ip_address: string | null
  user_agent: string | null
  created_at: Date
  last_activity: Date
}

export interface StreamLog {
  id: number
  key_code: string | null
  channel_name: string | null
  started_at: Date
}
