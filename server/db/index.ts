import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'
import { join } from 'path'

let db: ReturnType<typeof drizzle> | null = null

export function getDb() {
  if (!db) {
    const dbPath = process.env.DATABASE_PATH || join(process.cwd(), 'data', 'finance.db')
    
    const sqlite = new Database(dbPath)
    sqlite.pragma('journal_mode = WAL')
    
    db = drizzle(sqlite, { schema })
  }
  return db
}
