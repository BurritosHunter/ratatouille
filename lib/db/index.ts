import { neon } from "@neondatabase/serverless"

let sql: ReturnType<typeof neon> | undefined

/** Neon tagged-template client; connects on first use (avoids failing module load at build time). */
export function getSql() {
  if (!sql) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error("DATABASE_URL environment variable is not set")
    sql = neon(url)
  }
  return sql
}
