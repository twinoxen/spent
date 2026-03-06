import { join } from 'path'

type DatabaseMode = 'neon' | 'pglite'

export function resolveDatabaseMode(env: NodeJS.ProcessEnv = process.env): DatabaseMode {
  const databaseUrl = env.STORAGE_DATABASE_URL ?? env.DATABASE_URL

  if (databaseUrl) {
    return 'neon'
  }

  if (env.NODE_ENV === 'production') {
    throw new Error('Production requires DATABASE_URL (or STORAGE_DATABASE_URL). Refusing to fall back to PGlite.')
  }

  return 'pglite'
}

export async function runMigrations() {
  const migrationsFolder = join(process.cwd(), 'server', 'db', 'migrations')

  try {
    const mode = resolveDatabaseMode()

    if (mode === 'neon') {
      const databaseUrl = process.env.STORAGE_DATABASE_URL ?? process.env.DATABASE_URL
      const { neon } = await import('@neondatabase/serverless')
      const { drizzle } = await import('drizzle-orm/neon-http')
      const { migrate } = await import('drizzle-orm/neon-http/migrator')
      const db = drizzle({ client: neon(databaseUrl!) })
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

    console.log(`✅ Database migrations completed (mode=${mode})`)
  } catch (error) {
    console.error('❌ Database migration failed:', error)
    throw error
  }
}
