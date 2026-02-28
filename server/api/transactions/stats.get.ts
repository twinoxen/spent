import { getDb } from '../../db'
import { transactions, categories, merchants, accounts } from '../../db/schema'
import { and, eq, inArray, sql, desc, type SQL } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'

// Stored dates are MM/DD/YYYY — convert to YYYY-MM-DD for correct ISO string comparison
const isoDate = (col: any) =>
  sql`(substr(${col}, 7, 4) || '-' || substr(${col}, 1, 2) || '-' || substr(${col}, 4, 2))`

export default defineEventHandler(async (event) => {
  const db = getDb()
  const userId = event.context.user.id
  const query = getQuery(event)

  const startDate = query.startDate as string | undefined
  const endDate = query.endDate as string | undefined
  const purchasedBy = query.purchasedBy as string | undefined
  const categoryId = query.categoryId ? parseInt(query.categoryId as string) : undefined
  // Support multi-select via comma-separated accountIds, or single accountId for backwards compat
  const accountIdsParam = query.accountIds as string | undefined
  const accountIds = accountIdsParam
    ? accountIdsParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
    : query.accountId ? [parseInt(query.accountId as string)] : []

  // Subquery: IDs of accounts belonging to this user
  const userAccountIds = db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.userId, userId))

  // Build where conditions — always scope to user's accounts
  const conditions: SQL[] = [inArray(transactions.accountId, userAccountIds)]

  if (startDate) {
    conditions.push(sql`${isoDate(transactions.transactionDate)} >= ${startDate}`)
  }

  if (endDate) {
    conditions.push(sql`${isoDate(transactions.transactionDate)} <= ${endDate}`)
  }

  if (purchasedBy) {
    conditions.push(eq(transactions.purchasedBy, purchasedBy))
  }

  if (accountIds.length === 1 && accountIds[0] !== undefined) {
    conditions.push(eq(transactions.accountId, accountIds[0]))
  } else if (accountIds.length > 1) {
    conditions.push(inArray(transactions.accountId, accountIds))
  }

  // Total spend (excluding payments)
  const totalSpendResult = await db
    .select({
      total: sql<number>`sum(${transactions.amount})`,
    })
    .from(transactions)
    .where(and(...conditions, sql`${transactions.type} != 'Payment'`))

  const totalSpend = totalSpendResult[0]?.total || 0

  // Spend by category — self-join to get parent info so the client can build a hierarchy
  const parentCats = alias(categories, 'parent_cats')
  const spendByCategory = await db
    .select({
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      categoryColor: categories.color,
      categoryIcon: categories.icon,
      categoryParentId: categories.parentId,
      parentName: parentCats.name,
      parentColor: parentCats.color,
      parentIcon: parentCats.icon,
      total: sql<number>`sum(${transactions.amount})`,
      count: sql<number>`count(*)`,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(parentCats as any, eq(categories.parentId, parentCats.id))
    .where(and(...conditions, sql`${transactions.type} != 'Payment'`))
    .groupBy(
      transactions.categoryId,
      categories.name, categories.color, categories.icon, categories.parentId,
      parentCats.name, parentCats.color, parentCats.icon,
    )
    .orderBy(desc(sql`sum(${transactions.amount})`))

  // Top merchants — optionally filtered to a specific category (and its children)
  const merchantConditions = [...conditions]
  if (categoryId !== undefined) {
    merchantConditions.push(
      sql`(${transactions.categoryId} = ${categoryId} OR ${transactions.categoryId} IN (SELECT id FROM categories WHERE parent_id = ${categoryId}))`
    )
  }

  const topMerchants = await db
    .select({
      merchantId: transactions.merchantId,
      merchantName: merchants.normalizedName,
      total: sql<number>`sum(${transactions.amount})`,
      count: sql<number>`count(*)`,
    })
    .from(transactions)
    .leftJoin(merchants, eq(transactions.merchantId, merchants.id))
    .where(and(...merchantConditions, sql`${transactions.type} != 'Payment'`))
    .groupBy(transactions.merchantId, merchants.normalizedName)
    .orderBy(desc(sql`sum(${transactions.amount})`))
    .limit(10)

  // Spend by purchaser
  const spendByPurchaser = await db
    .select({
      purchasedBy: transactions.purchasedBy,
      total: sql<number>`sum(${transactions.amount})`,
      count: sql<number>`count(*)`,
    })
    .from(transactions)
    .where(and(...conditions, sql`${transactions.type} != 'Payment'`))
    .groupBy(transactions.purchasedBy)
    .orderBy(desc(sql`sum(${transactions.amount})`))

  // Spend over time (by month) — derive YYYY-MM from MM/DD/YYYY stored format
  const spendOverTime = await db
    .select({
      month: sql<string>`(substr(${transactions.transactionDate}, 7, 4) || '-' || substr(${transactions.transactionDate}, 1, 2))`,
      total: sql<number>`sum(${transactions.amount})`,
      count: sql<number>`count(*)`,
    })
    .from(transactions)
    .where(and(...conditions, sql`${transactions.type} != 'Payment'`))
    .groupBy(sql`(substr(${transactions.transactionDate}, 7, 4) || '-' || substr(${transactions.transactionDate}, 1, 2))`)
    .orderBy(sql`(substr(${transactions.transactionDate}, 7, 4) || '-' || substr(${transactions.transactionDate}, 1, 2))`)

  return {
    totalSpend,
    spendByCategory,
    topMerchants,
    spendByPurchaser,
    spendOverTime,
  }
})
