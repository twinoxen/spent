import { join } from 'path'

export function getRequiredDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const databaseUrl = env.STORAGE_DATABASE_URL

  if (!databaseUrl) {
    throw new Error('STORAGE_DATABASE_URL is required in all environments.')
  }

  return databaseUrl
}

export function isNeonUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url)
    return hostname.includes('neon.tech') || hostname.includes('neon.host')
  } catch {
    return false
  }
}

export async function runMigrations() {
  const migrationsFolder = join(process.cwd(), 'server', 'db', 'migrations')
  const databaseUrl = getRequiredDatabaseUrl()

  try {
    if (isNeonUrl(databaseUrl)) {
      const { neon } = await import('@neondatabase/serverless')
      const { drizzle } = await import('drizzle-orm/neon-http')
      const { migrate } = await import('drizzle-orm/neon-http/migrator')
      const db = drizzle({ client: neon(databaseUrl) })
      await migrate(db, { migrationsFolder })
      console.log('✅ Database migrations completed (driver=neon-http)')
    } else {
      const { Pool } = await import('pg')
      const { drizzle } = await import('drizzle-orm/node-postgres')
      const { migrate } = await import('drizzle-orm/node-postgres/migrator')
      const pool = new Pool({ connectionString: databaseUrl })
      const db = drizzle({ client: pool })
      await migrate(db, { migrationsFolder })
      await pool.end()
      console.log('✅ Database migrations completed (driver=node-postgres)')
    }
  } catch (error) {
    console.error('❌ Database migration failed:', error)
    throw error
  }
}
