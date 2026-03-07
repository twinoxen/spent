import { join } from 'path'

export function getRequiredDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const databaseUrl = env.STORAGE_DATABASE_URL

  if (!databaseUrl) {
    throw new Error('STORAGE_DATABASE_URL is required in all environments.')
  }

  return databaseUrl
}

export function resolveDatabaseDriver(databaseUrl: string): 'neon-http' | 'node-postgres' {
  try {
    const parsedUrl = new URL(databaseUrl)
    if (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1') {
      return 'node-postgres'
    }
  } catch {
    // Ignore parsing errors and default to neon-http for backwards compatibility.
  }

  return 'neon-http'
}

export async function runMigrations() {
  const migrationsFolder = join(process.cwd(), 'server', 'db', 'migrations')

  try {
    const databaseUrl = getRequiredDatabaseUrl()
    const driver = resolveDatabaseDriver(databaseUrl)

    if (driver === 'node-postgres') {
      const { Pool } = await import('pg')
      const { drizzle } = await import('drizzle-orm/node-postgres')
      const { migrate } = await import('drizzle-orm/node-postgres/migrator')
      const pool = new Pool({ connectionString: databaseUrl })
      const db = drizzle(pool)

      await migrate(db, { migrationsFolder })
      await pool.end()
      console.log('✅ Database migrations completed (driver=node-postgres)')
      return
    }

    const { neon } = await import('@neondatabase/serverless')
    const { drizzle } = await import('drizzle-orm/neon-http')
    const { migrate } = await import('drizzle-orm/neon-http/migrator')
    const db = drizzle({ client: neon(databaseUrl) })

    await migrate(db, { migrationsFolder })

    console.log('✅ Database migrations completed (driver=neon-http)')
  } catch (error) {
    console.error('❌ Database migration failed:', error)
    throw error
  }
}
