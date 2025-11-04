import mysql from "mysql2/promise"

class DatabasePool {
  constructor() {
    this.pool = null
  }

  async initialize() {
    try {
      this.pool = mysql.createPool({
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "iptv",
        waitForConnections: true,
        connectionLimit: 100, // High connection limit for 10K users
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
      })

      // Test connection
      const connection = await this.pool.getConnection()
      console.log("[v0] Database connected successfully")
      connection.release()
    } catch (error) {
      console.error("[v0] Database connection failed:", error)
      throw error
    }
  }

  isConnected() {
    return this.pool !== null
  }

  async ping() {
    try {
      const [rows] = await this.pool.query("SELECT 1")
      return "ok"
    } catch {
      return "error"
    }
  }

  async query(sql, params = []) {
    try {
      const [rows] = await this.pool.execute(sql, params)
      return rows
    } catch (error) {
      console.error("[v0] Database query error:", error)
      throw error
    }
  }

  async transaction(callback) {
    const connection = await this.pool.getConnection()
    try {
      await connection.beginTransaction()
      const result = await callback(connection)
      await connection.commit()
      return result
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }
}

export default new DatabasePool()
export { DatabasePool }
