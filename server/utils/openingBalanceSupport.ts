import { sql } from 'drizzle-orm'

const COLUMN_CACHE_TTL_MS = 30_000

let columnExistsCache: { value: boolean; expiresAt: number } | null = null
let columnExistsInflight: Promise<boolean> | null = null

export function isMissingOpeningBalanceColumn(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const pgError = error as { code?: string; message?: string }
  return pgError.code === '42703' && (pgError.message?.includes('is_opening_balance') ?? false)
}

export function logAccountsQueryError(scope: 'api/accounts' | 'mcp/list_accounts', error: unknown, phase: 'primary' | 'fallback') {
  const pgError = error as {
    code?: string
    message?: string
    detail?: string
    hint?: string
    severity?: string
  }

  console.error(`[${scope}] list_accounts query failed`, {
    phase,
    code: pgError?.code ?? null,
    message: pgError?.message ?? String(error),
    detail: pgError?.detail ?? null,
    hint: pgError?.hint ?? null,
    severity: pgError?.severity ?? null,
  })
}

async function fetchOpeningBalanceColumnExists(db: any): Promise<boolean> {
  const result = await db.execute<{ exists: boolean }>(sql`
    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'transactions'
        and column_name = 'is_opening_balance'
    ) as "exists"
  `)

  const rows = (result as any)?.rows ?? result
  return Boolean(rows?.[0]?.exists)
}

export async function getOpeningBalanceColumnExists(db: any): Promise<boolean> {
  const now = Date.now()
  if (columnExistsCache && columnExistsCache.expiresAt > now) {
    return columnExistsCache.value
  }

  if (!columnExistsInflight) {
    columnExistsInflight = (async () => {
      try {
        const exists = await fetchOpeningBalanceColumnExists(db)
        columnExistsCache = { value: exists, expiresAt: Date.now() + COLUMN_CACHE_TTL_MS }
        return exists
      } catch (error) {
        if (isMissingOpeningBalanceColumn(error)) {
          columnExistsCache = { value: false, expiresAt: Date.now() + COLUMN_CACHE_TTL_MS }
          return false
        }
        throw error
      } finally {
        columnExistsInflight = null
      }
    })()
  }

  return columnExistsInflight
}

export function __resetOpeningBalanceColumnCacheForTests() {
  columnExistsCache = null
  columnExistsInflight = null
}
