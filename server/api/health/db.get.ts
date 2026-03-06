import { sql } from 'drizzle-orm'
import { getDb, getDbRuntimeInfo } from '../../db'

export default defineEventHandler(async () => {
  const db = await getDb()
  const runtime = getDbRuntimeInfo()

  let transactionsIsOpeningBalanceExists: boolean | null = null
  let latestMigration: Record<string, unknown> | null = null
  let errors: Record<string, string> = {}

  try {
    const columnResult = await db.execute<{ exists: boolean }>(sql`
      select exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'transactions'
          and column_name = 'is_opening_balance'
      ) as "exists"
    `)
    const rows = (columnResult as any)?.rows ?? columnResult
    transactionsIsOpeningBalanceExists = Boolean(rows?.[0]?.exists)
  } catch (error) {
    errors.columnCheck = (error as any)?.message ?? 'column-check-failed'
  }

  try {
    const migrationResult = await db.execute(sql`
      select *
      from "__drizzle_migrations"
      order by id desc
      limit 1
    `)
    const rows = (migrationResult as any)?.rows ?? migrationResult
    latestMigration = rows?.[0] ?? null
  } catch (error) {
    errors.latestMigration = (error as any)?.message ?? 'latest-migration-unavailable'
  }

  if (Object.keys(errors).length === 0) {
    errors = {}
  }

  return {
    env: {
      DATABASE_URL: runtime.databaseUrlSet ? '[set]' : '[not set]',
      STORAGE_DATABASE_URL: runtime.storageDatabaseUrlSet ? '[set]' : '[not set]',
    },
    driver: runtime.resolvedDriverPath,
    checks: {
      transactionsIsOpeningBalanceExists,
      latestMigration,
    },
    ...(Object.keys(errors).length > 0 ? { errors } : {}),
  }
})
