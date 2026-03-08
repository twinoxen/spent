import * as schema from './schema'
import { getRequiredDatabaseUrl, isNeonUrl } from './migrate'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let db: any = null
let activeDriver: 'neon-http' | 'node-postgres' | null = null

async function createDb() {
  const databaseUrl = getRequiredDatabaseUrl()

  if (isNeonUrl(databaseUrl)) {
    const { neon } = await import('@neondatabase/serverless')
    const { drizzle } = await import('drizzle-orm/neon-http')
    activeDriver = 'neon-http'
    console.log('[db] mode=neon-http')
    return drizzle({ client: neon(databaseUrl), schema })
  } else {
    const { Pool } = await import('pg')
    const { drizzle } = await import('drizzle-orm/node-postgres')
    activeDriver = 'node-postgres'
    console.log('[db] mode=node-postgres')
    const pool = new Pool({ connectionString: databaseUrl })
    return drizzle({ client: pool, schema })
  }
}

export async function getDb() {
  if (!db) {
    db = await createDb()
  }
  return db
}

export function getDbRuntimeInfo() {
  const storageDatabaseUrl = process.env.STORAGE_DATABASE_URL

  return {
    storageDatabaseUrlSet: Boolean(storageDatabaseUrl),
    activeDriver,
    resolvedDriverPath: activeDriver ?? 'neon-http',
  }
}
