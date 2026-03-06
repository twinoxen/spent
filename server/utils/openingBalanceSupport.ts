import { sql } from 'drizzle-orm'

const COLUMN_CACHE_TTL_MS = 60_000

type QueryPath = 'A' | 'B'

let columnExistsCache: { value: boolean; expiresAt: number } | null = null
let columnExistsInflight: Promise<boolean> | null = null

export function pathForOpeningBalanceSupport(supportsOpeningBalance: boolean): QueryPath {
  return supportsOpeningBalance ? 'A' : 'B'
}

export function logAccountsQueryError(
  scope: 'api/accounts' | 'mcp/list_accounts',
  error: unknown,
  queryPath: QueryPath,
) {
  const message = error instanceof Error
    ? error.message
    : (typeof error === 'string' ? error : JSON.stringify(error))

  console.error(`[${scope}] list_accounts query failed`, {
    queryPath,
    messageLength: message?.length ?? 0,
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
