import { join } from 'path'

export async function runMigrations() {
  const migrationsFolder = join(process.cwd(), 'server', 'db', 'migrations')

  try {
    if (process.env.DATABASE_URL) {
      const { neon } = await import('@neondatabase/serverless')
      const { drizzle } = await import('drizzle-orm/neon-http')
      const { migrate } = await import('drizzle-orm/neon-http/migrator')
      const db = drizzle({ client: neon(process.env.DATABASE_URL) })
      await migrate(db, { migrationsFolder })
    } else {
      const { PGlite } = await import('@electric-sql/pglite')
      const { drizzle } = await import('drizzle-orm/pglite')
      const { migrate } = await import('drizzle-orm/pglite/migrator')
      const dbPath = process.env.DATABASE_PATH || join(process.cwd(), 'data', 'finance.pgdata')
      const client = new PGlite(dbPath)
      const db = drizzle(client)
      await migrate(db, { migrationsFolder })
    }
    console.log('✅ Database migrations completed')
  } catch (error) {
    console.error('❌ Database migration failed:', error)
    throw error
  }
}
