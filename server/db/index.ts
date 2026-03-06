import * as schema from './schema'
import { join } from 'path'
import { resolveDatabaseMode } from './migrate'

type DbInstance = Awaited<ReturnType<typeof createDb>>

let db: DbInstance | null = null
let activeDriver: 'neon-http' | 'pglite' | null = null

async function createDb() {
  const mode = resolveDatabaseMode()

  if (mode === 'neon') {
    const databaseUrl = process.env.STORAGE_DATABASE_URL ?? process.env.DATABASE_URL
    const { neon } = await import('@neondatabase/serverless')
    const { drizzle } = await import('drizzle-orm/neon-http')
    activeDriver = 'neon-http'
    console.log('[db] mode=neon')
    return drizzle({ client: neon(databaseUrl!), schema })
  }

  const { PGlite } = await import('@electric-sql/pglite')
  const { drizzle } = await import('drizzle-orm/pglite')
  const dbPath = process.env.DATABASE_PATH || join(process.cwd(), 'data', 'finance.pgdata')
  const client = new PGlite(dbPath)
  activeDriver = 'pglite'
  console.log('[db] mode=pglite')
  return drizzle(client, { schema })
}

export async function getDb(): Promise<DbInstance> {
  if (!db) {
    db = await createDb()
  }
  return db
}

export function getDbRuntimeInfo() {
  const databaseUrl = process.env.DATABASE_URL
  const storageDatabaseUrl = process.env.STORAGE_DATABASE_URL

  return {
    databaseUrlSet: Boolean(databaseUrl),
    storageDatabaseUrlSet: Boolean(storageDatabaseUrl),
    activeDriver,
    resolvedDriverPath: activeDriver ?? (storageDatabaseUrl || databaseUrl ? 'neon-http' : 'pglite'),
  }
}
