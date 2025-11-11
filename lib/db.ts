import { neon } from "@neondatabase/serverless"

const getDatabaseUrl = () => {
  // Local PostgreSQL for single server (no API key needed)
  if (process.env.LOCAL_DATABASE_URL) {
    return process.env.LOCAL_DATABASE_URL
  }
  // Neon for cloud deployment
  return process.env.NEON_DATABASE_URL || process.env.DATABASE_URL
}

const sql = neon(getDatabaseUrl()!)

export function getDB() {
  return {
    query: sql,
  }
}

export const db = {
  query: sql,

  async getAdmin(username: string) {
    const result = await sql`SELECT * FROM admins WHERE username = ${username} LIMIT 1`
    return result[0]
  },

  async getAllKeys() {
    return await sql`SELECT * FROM user_keys ORDER BY created_at DESC`
  },

  async createKey(key: string, expiresAt: Date | null, maxConnections: number) {
    const result = await sql`
      INSERT INTO user_keys (key, expires_at, max_connections)
      VALUES (${key}, ${expiresAt}, ${maxConnections})
      RETURNING *
    `
    return result[0]
  },

  async deleteKey(keyId: number) {
    await sql`DELETE FROM user_keys WHERE id = ${keyId}`
  },

  async validateKey(key: string) {
    const result = await sql`
      SELECT * FROM user_keys 
      WHERE key = ${key} 
      AND (expires_at IS NULL OR expires_at > NOW())
      LIMIT 1
    `
    return result[0]
  },

  async getAllSources() {
    return await sql`SELECT * FROM m3u_sources ORDER BY created_at DESC`
  },

  async createSource(name: string, url: string) {
    const result = await sql`
      INSERT INTO m3u_sources (name, url)
      VALUES (${name}, ${url})
      RETURNING *
    `
    return result[0]
  },

  async deleteSource(sourceId: number) {
    await sql`DELETE FROM m3u_sources WHERE id = ${sourceId}`
  },

  async getAllServers() {
    return await sql`SELECT * FROM servers ORDER BY created_at DESC`
  },

  async createServer(name: string, host: string, sshUser: string, sshKey: string) {
    const result = await sql`
      INSERT INTO servers (name, host, ssh_user, ssh_key, status)
      VALUES (${name}, ${host}, ${sshUser}, ${sshKey}, 'inactive')
      RETURNING *
    `
    return result[0]
  },

  async updateServerStatus(serverId: number, status: string, metrics?: any) {
    await sql`
      UPDATE servers 
      SET status = ${status}, 
          last_health_check = NOW(),
          metrics = ${metrics ? JSON.stringify(metrics) : null}
      WHERE id = ${serverId}
    `
  },

  async deleteServer(serverId: number) {
    await sql`DELETE FROM servers WHERE id = ${serverId}`
  },
}
