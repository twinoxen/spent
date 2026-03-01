import * as schema from './schema'
import { join } from 'path'

type DbInstance = Awaited<ReturnType<typeof createDb>>

let db: DbInstance | null = null

async function createDb() {
  const databaseUrl = process.env.STORAGE_DATABASE_URL ?? process.env.DATABASE_URL
  if (databaseUrl) {
    const { neon } = await import('@neondatabase/serverless')
    const { drizzle } = await import('drizzle-orm/neon-http')
    return drizzle({ client: neon(databaseUrl), schema })
  } else {
    const { PGlite } = await import('@electric-sql/pglite')
    const { drizzle } = await import('drizzle-orm/pglite')
    const dbPath = process.env.DATABASE_PATH || join(process.cwd(), 'data', 'finance.pgdata')
    const client = new PGlite(dbPath)
    return drizzle(client, { schema })
  }
}

export async function getDb(): Promise<DbInstance> {
  if (!db) {
    db = await createDb()
  }
  return db
}
