import { getDb } from '../../db'
import { transactions, merchants, categories, accounts } from '../../db/schema'
import { eq, desc, asc, and, sql, inArray } from 'drizzle-orm'
import { parseTransactionFilters, buildTransactionWhereClause } from '../../utils/transactionFilters'

const SORTABLE_COLUMNS = {
  transactionDate: transactions.transactionDate,
  description: transactions.description,
  amount: transactions.amount,
  purchasedBy: transactions.purchasedBy,
  merchant: merchants.normalizedName,
  category: categories.name,
  account: accounts.name,
} as const

type SortableColumn = keyof typeof SORTABLE_COLUMNS

export default defineEventHandler(async (event) => {
  const db = await getDb()
  const userId = event.context.user.id
  const query = getQuery(event)

  const limit = query.limit ? Number(query.limit) : 100
  const offset = query.offset ? Number(query.offset) : 0

  const sortByParam = String(query.sortBy ?? '')
  const sortBy: SortableColumn | null = sortByParam in SORTABLE_COLUMNS ? (sortByParam as SortableColumn) : null
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc'

  const filters = parseTransactionFilters(query)

  const userAccountIds = db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.userId, userId))

  const whereClause = buildTransactionWhereClause(userAccountIds, filters)

  const orderClauses = sortBy
    ? [sortOrder === 'asc' ? asc(SORTABLE_COLUMNS[sortBy]) : desc(SORTABLE_COLUMNS[sortBy])]
    : [desc(transactions.isPending), desc(transactions.transactionDate), desc(transactions.id)]

  const results = await db
    .select({
      id: transactions.id,
      transactionDate: transactions.transactionDate,
      clearingDate: transactions.clearingDate,
      isPending: transactions.isPending,
      description: transactions.description,
      type: transactions.type,
      amount: transactions.amount,
      purchasedBy: transactions.purchasedBy,
      notes: transactions.notes,
      tags: transactions.tags,
      sourceFile: transactions.sourceFile,
      createdAt: transactions.createdAt,
      merchant: {
        id: merchants.id,
        name: merchants.normalizedName,
      },
      category: {
        id: categories.id,
        name: categories.name,
        color: categories.color,
        icon: categories.icon,
      },
      account: {
        id: accounts.id,
        name: accounts.name,
        color: accounts.color,
      },
    })
    .from(transactions)
    .leftJoin(merchants, eq(transactions.merchantId, merchants.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(whereClause)
    .orderBy(...orderClauses)
    .limit(limit)
    .offset(offset)

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactions)
    .where(whereClause)

  const total = countResult[0]?.count || 0

  return {
    transactions: results,
    total,
    limit,
    offset,
  }
})
