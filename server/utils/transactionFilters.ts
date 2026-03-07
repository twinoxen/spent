import { transactions, accounts } from '../db/schema'
import { eq, and, gte, lte, like, or, isNull, inArray, sql } from 'drizzle-orm'

export interface TransactionFilterParams {
  accountId?: number
  categoryId?: number
  merchantId?: number
  purchasedBy?: string
  type?: string
  search?: string
  startDate?: string
  endDate?: string
  date?: string
  uncategorizedOnly?: boolean
  amountSign?: 'debit' | 'credit'
  pendingOnly?: boolean
}

/**
 * Parse raw query params into a strongly-typed filter bag.
 */
export function parseTransactionFilters(query: Record<string, any>): TransactionFilterParams {
  return {
    accountId: query.accountId ? Number(query.accountId) : undefined,
    categoryId: query.categoryId ? Number(query.categoryId) : undefined,
    merchantId: query.merchantId ? Number(query.merchantId) : undefined,
    purchasedBy: query.purchasedBy as string | undefined,
    type: query.type as string | undefined,
    search: query.search as string | undefined,
    startDate: query.startDate as string | undefined,
    endDate: query.endDate as string | undefined,
    date: query.date as string | undefined,
    uncategorizedOnly: query.uncategorizedOnly === 'true',
    amountSign: query.amountSign === 'credit' ? 'credit' : query.amountSign === 'debit' ? 'debit' : undefined,
    pendingOnly: query.pendingOnly === 'true',
  }
}

/**
 * Build a Drizzle WHERE clause from parsed filters.
 *
 * @param userAccountIds - Drizzle subquery that returns account IDs owned by the user.
 *                         Callers obtain this with:
 *                           db.select({ id: accounts.id }).from(accounts).where(eq(accounts.userId, userId))
 */
export function buildTransactionWhereClause(
  userAccountIds: any,
  filters: TransactionFilterParams,
) {
  const conditions: any[] = [inArray(transactions.accountId, userAccountIds)]

  if (filters.accountId) {
    conditions.push(eq(transactions.accountId, filters.accountId))
  }

  if (filters.categoryId) {
    conditions.push(eq(transactions.categoryId, filters.categoryId))
  }

  if (filters.uncategorizedOnly) {
    conditions.push(isNull(transactions.categoryId))
  }

  if (filters.amountSign === 'debit') {
    conditions.push(sql`${transactions.amount} < 0`)
  } else if (filters.amountSign === 'credit') {
    conditions.push(sql`${transactions.amount} > 0`)
  }

  if (filters.pendingOnly) {
    conditions.push(eq(transactions.isPending, true))
  }

  if (filters.merchantId) {
    conditions.push(eq(transactions.merchantId, filters.merchantId))
  }

  if (filters.purchasedBy) {
    conditions.push(eq(transactions.purchasedBy, filters.purchasedBy))
  }

  if (filters.type) {
    conditions.push(eq(transactions.type, filters.type))
  }

  if (filters.search) {
    const searchClause = or(
      like(transactions.description, `%${filters.search}%`),
      like(transactions.notes, `%${filters.search}%`),
    )
    if (searchClause) conditions.push(searchClause)
  }

  if (filters.date) {
    conditions.push(eq(transactions.transactionDate, filters.date))
  }

  if (filters.startDate) {
    conditions.push(gte(transactions.transactionDate, filters.startDate))
  }

  if (filters.endDate) {
    conditions.push(lte(transactions.transactionDate, filters.endDate))
  }

  return and(...conditions)
}
