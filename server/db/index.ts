import * as schema from './schema'
import { join } from 'path'

type DbInstance = Awaited<ReturnType<typeof createDb>>

let db: DbInstance | null = null
let activeDriver: 'neon-http' | 'pglite' | null = null

async function createDb() {
  const databaseUrl = process.env.STORAGE_DATABASE_URL ?? process.env.DATABASE_URL
  if (databaseUrl) {
    const { neon } = await import('@neondatabase/serverless')
    const { drizzle } = await import('drizzle-orm/neon-http')
    activeDriver = 'neon-http'
    return drizzle({ client: neon(databaseUrl), schema })
  } else {
    const { PGlite } = await import('@electric-sql/pglite')
    const { drizzle } = await import('drizzle-orm/pglite')
    const dbPath = process.env.DATABASE_PATH || join(process.cwd(), 'data', 'finance.pgdata')
    const client = new PGlite(dbPath)
    activeDriver = 'pglite'
    return drizzle(client, { schema })
  }
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
