require("dotenv").config({ path: ".env.local" })

const { neon } = require("@neondatabase/serverless")
const fs = require("fs")
const path = require("path")

const sql = neon(process.env.NEON_NEON_DATABASE_URL)
;(async () => {
  try {
    const sqlScript = fs.readFileSync(path.join(__dirname, "001_add_xtream_support.sql"), "utf8")

    // Her SQL statement'ı ayrı ayrı çalıştır
    const statements = sqlScript
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"))

    console.log(`Running ${statements.length} SQL statements...`)

    for (const statement of statements) {
      console.log("Executing:", statement.substring(0, 60) + "...")
      await sql(statement)
    }

    console.log("✅ Database migration completed successfully!")
    process.exit(0)
  } catch (err) {
    console.error("❌ Migration error:", err.message)
    console.error(err)
    process.exit(1)
  }
})()
