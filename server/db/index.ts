import * as schema from './schema'
import { getRequiredDatabaseUrl } from './migrate'

type DbInstance = Awaited<ReturnType<typeof createDb>>

let db: DbInstance | null = null
let activeDriver: 'neon-http' | null = null

async function createDb() {
  const databaseUrl = getRequiredDatabaseUrl()
  const { neon } = await import('@neondatabase/serverless')
  const { drizzle } = await import('drizzle-orm/neon-http')
  activeDriver = 'neon-http'
  console.log('[db] mode=neon-http')
  return drizzle({ client: neon(databaseUrl), schema })
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
    resolvedDriverPath: activeDriver ?? 'neon-http',
  }
}
