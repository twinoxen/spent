import * as schema from './schema'
import { getRequiredDatabaseUrl, resolveDatabaseDriver } from './migrate'

type DbInstance = Awaited<ReturnType<typeof createDb>>

let db: DbInstance | null = null
let activeDriver: 'neon-http' | 'node-postgres' | null = null

async function createDb() {
  const databaseUrl = getRequiredDatabaseUrl()
  const driver = resolveDatabaseDriver(databaseUrl)

  if (driver === 'node-postgres') {
    const { Pool } = await import('pg')
    const { drizzle } = await import('drizzle-orm/node-postgres')
    activeDriver = 'node-postgres'
    console.log('[db] mode=node-postgres')
    return drizzle(new Pool({ connectionString: databaseUrl }), { schema })
  }

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
  const storageDatabaseUrl = process.env.STORAGE_DATABASE_URL

  return {
    storageDatabaseUrlSet: Boolean(storageDatabaseUrl),
    activeDriver,
    resolvedDriverPath: activeDriver ?? 'neon-http',
  }
}
