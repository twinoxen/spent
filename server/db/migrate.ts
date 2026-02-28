import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { getDb } from './index'
import { join } from 'path'

export function runMigrations() {
  const db = getDb()
  const migrationsFolder = join(process.cwd(), 'server', 'db', 'migrations')
  
  try {
    migrate(db, { migrationsFolder })
    console.log('✅ Database migrations completed')
  } catch (error) {
    console.error('❌ Database migration failed:', error)
    throw error
  }
}
