import { getDb } from '../../db'
import { transactions, merchants, categories, accounts } from '../../db/schema'
import { eq, desc, and, gte, lte, like, or, sql, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const query = getQuery(event)
  
  // Parse filters
  const accountId = query.accountId ? Number(query.accountId) : undefined
  const categoryId = query.categoryId ? Number(query.categoryId) : undefined
  const merchantId = query.merchantId ? Number(query.merchantId) : undefined
  const purchasedBy = query.purchasedBy as string | undefined
  const type = query.type as string | undefined
  const search = query.search as string | undefined
  const startDate = query.startDate as string | undefined
  const endDate = query.endDate as string | undefined
  const date = query.date as string | undefined  // YYYY-MM-DD exact day filter
  const uncategorizedOnly = query.uncategorizedOnly === 'true'
  const limit = query.limit ? Number(query.limit) : 100
  const offset = query.offset ? Number(query.offset) : 0
  
  // Build where conditions
  const conditions = []

  if (accountId) {
    conditions.push(eq(transactions.accountId, accountId))
  }
  
  if (categoryId) {
    conditions.push(eq(transactions.categoryId, categoryId))
  }
  
  if (uncategorizedOnly) {
    conditions.push(isNull(transactions.categoryId))
  }
  
  if (merchantId) {
    conditions.push(eq(transactions.merchantId, merchantId))
  }
  
  if (purchasedBy) {
    conditions.push(eq(transactions.purchasedBy, purchasedBy))
  }
  
  if (type) {
    conditions.push(eq(transactions.type, type))
  }
  
  if (search) {
    conditions.push(
      or(
        like(transactions.description, `%${search}%`),
        like(transactions.notes, `%${search}%`)
      )
    )
  }
  
  if (date) {
    // Convert YYYY-MM-DD → MM/DD/YYYY to match stored format
    const [y, m, d] = date.split('-')
    conditions.push(eq(transactions.transactionDate, `${m}/${d}/${y}`))
  }

  if (startDate) {
    conditions.push(gte(transactions.transactionDate, startDate))
  }
  
  if (endDate) {
    conditions.push(lte(transactions.transactionDate, endDate))
  }
  
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined
  
  // Get transactions with merchant, category, and account info
  const results = await db
    .select({
      id: transactions.id,
      transactionDate: transactions.transactionDate,
      clearingDate: transactions.clearingDate,
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
    .orderBy(desc(transactions.transactionDate), desc(transactions.id))
    .limit(limit)
    .offset(offset)
  
  // Get total count
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
