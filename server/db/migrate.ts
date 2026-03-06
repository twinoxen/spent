import { join } from 'path'

export function getRequiredDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const databaseUrl = env.STORAGE_DATABASE_URL

  if (!databaseUrl) {
    throw new Error('STORAGE_DATABASE_URL is required in all environments.')
  }

  return databaseUrl
}

export async function runMigrations() {
  const migrationsFolder = join(process.cwd(), 'server', 'db', 'migrations')

  try {
    const databaseUrl = getRequiredDatabaseUrl()
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
