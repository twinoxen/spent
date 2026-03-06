import { sql } from 'drizzle-orm'
import { getDb, getDbRuntimeInfo } from '../../db'

export default defineEventHandler(async () => {
  const db = await getDb()
  const runtime = getDbRuntimeInfo()

  let transactionsIsOpeningBalanceExists: boolean | null = null
  let drizzleMigrationsTableExists: boolean | null = null
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
    const migrationTableResult = await db.execute<{ exists: boolean }>(sql`
      select exists (
        select 1
        from information_schema.tables
        where table_schema = 'public'
          and table_name = '__drizzle_migrations'
      ) as "exists"
    `)
    const rows = (migrationTableResult as any)?.rows ?? migrationTableResult
    drizzleMigrationsTableExists = Boolean(rows?.[0]?.exists)
  } catch (error) {
    errors.migrationTableCheck = (error as any)?.message ?? 'migration-table-check-failed'
  }

  if (Object.keys(errors).length === 0) {
    errors = {}
  }

  return {
    env: {
      databaseUrlSet: runtime.databaseUrlSet,
      storageDatabaseUrlSet: runtime.storageDatabaseUrlSet,
    },
    driver: runtime.resolvedDriverPath,
    checks: {
      transactionsIsOpeningBalanceExists,
      drizzleMigrationsTableExists,
    },
    ...(Object.keys(errors).length > 0 ? { errors } : {}),
  }
})
