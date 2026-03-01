import { getDb } from '../../db'
import { transactions, categories, merchants, accounts } from '../../db/schema'
import { and, eq, inArray, sql, desc, type SQL } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'

// Stored dates are MM/DD/YYYY — convert to YYYY-MM-DD for correct ISO string comparison
const isoDate = (col: any) =>
  sql`(substr(${col}, 7, 4) || '-' || substr(${col}, 1, 2) || '-' || substr(${col}, 4, 2))`

export default defineEventHandler(async (event) => {
  const db = await getDb()
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

  // flow=expense (default) → drill breakdowns into expenses (amount < 0)
  // flow=income            → drill breakdowns into income (amount > 0)
  // Summary totals for BOTH directions are always returned regardless of flow.
  const flow = (query.flow as string | undefined) === 'income' ? 'income' : 'expense'

  // Subquery: IDs of accounts belonging to this user
  const userAccountIds = db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.userId, userId))

  // Base conditions shared by all queries (scope + date + person + account filters)
  const baseConditions: SQL[] = [inArray(transactions.accountId, userAccountIds)]

  if (startDate) {
    baseConditions.push(sql`${isoDate(transactions.transactionDate)} >= ${startDate}`)
  }
  if (endDate) {
    baseConditions.push(sql`${isoDate(transactions.transactionDate)} <= ${endDate}`)
  }
  if (purchasedBy) {
    baseConditions.push(eq(transactions.purchasedBy, purchasedBy))
  }
  if (accountIds.length === 1 && accountIds[0] !== undefined) {
    baseConditions.push(eq(transactions.accountId, accountIds[0]))
  } else if (accountIds.length > 1) {
    baseConditions.push(inArray(transactions.accountId, accountIds))
  }

  // Sign-based flow conditions
  const expenseCondition = sql`${transactions.amount} < 0`
  const incomeCondition = sql`${transactions.amount} > 0`
  const flowCondition = flow === 'income' ? incomeCondition : expenseCondition

  // Sum expressions: expenses negate so the result is a positive figure; income is already positive
  const expenseSumExpr = sql<number>`-sum(${transactions.amount})`
  const incomeSumExpr = sql<number>`sum(${transactions.amount})`
  const flowSumExpr = flow === 'income' ? incomeSumExpr : expenseSumExpr

  // Full conditions for each direction
  const expenseConditions = [...baseConditions, expenseCondition]
  const incomeConditions = [...baseConditions, incomeCondition]
  const flowConditions = [...baseConditions, flowCondition]

  // Always fetch both summary totals in parallel — no double round-trip needed
  const [expenseResult, incomeResult] = await Promise.all([
    db.select({ total: expenseSumExpr }).from(transactions).where(and(...expenseConditions)),
    db.select({ total: incomeSumExpr }).from(transactions).where(and(...incomeConditions)),
  ])

  const totalExpenses = expenseResult[0]?.total || 0
  const totalIncome = incomeResult[0]?.total || 0
  // Backwards-compat alias used by the existing dashboard
  const totalSpend = totalExpenses

  // Breakdown by category — self-join to get parent info so the client can build a hierarchy
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
      total: flowSumExpr,
      count: sql<number>`count(*)`,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(parentCats as any, eq(categories.parentId, parentCats.id))
    .where(and(...flowConditions))
    .groupBy(
      transactions.categoryId,
      categories.name, categories.color, categories.icon, categories.parentId,
      parentCats.name, parentCats.color, parentCats.icon,
    )
    .orderBy(desc(flowSumExpr))

  // Top merchants — optionally filtered to a specific category (and its children)
  const merchantConditions = [...flowConditions]
  if (categoryId !== undefined) {
    merchantConditions.push(
      sql`(${transactions.categoryId} = ${categoryId} OR ${transactions.categoryId} IN (SELECT id FROM categories WHERE parent_id = ${categoryId}))`
    )
  }

  const topMerchants = await db
    .select({
      merchantId: transactions.merchantId,
      merchantName: merchants.normalizedName,
      total: flowSumExpr,
      count: sql<number>`count(*)`,
    })
    .from(transactions)
    .leftJoin(merchants, eq(transactions.merchantId, merchants.id))
    .where(and(...merchantConditions))
    .groupBy(transactions.merchantId, merchants.normalizedName)
    .orderBy(desc(flowSumExpr))
    .limit(10)

  // Breakdown by purchaser
  const spendByPurchaser = await db
    .select({
      purchasedBy: transactions.purchasedBy,
      total: flowSumExpr,
      count: sql<number>`count(*)`,
    })
    .from(transactions)
    .where(and(...flowConditions))
    .groupBy(transactions.purchasedBy)
    .orderBy(desc(flowSumExpr))

  // Breakdown over time (by month) — derive YYYY-MM from MM/DD/YYYY stored format
  const spendOverTime = await db
    .select({
      month: sql<string>`(substr(${transactions.transactionDate}, 7, 4) || '-' || substr(${transactions.transactionDate}, 1, 2))`,
      total: flowSumExpr,
      count: sql<number>`count(*)`,
    })
    .from(transactions)
    .where(and(...flowConditions))
    .groupBy(sql`(substr(${transactions.transactionDate}, 7, 4) || '-' || substr(${transactions.transactionDate}, 1, 2))`)
    .orderBy(sql`(substr(${transactions.transactionDate}, 7, 4) || '-' || substr(${transactions.transactionDate}, 1, 2))`)

  return {
    flow,
    totalSpend,
    totalExpenses,
    totalIncome,
    spendByCategory,
    topMerchants,
    spendByPurchaser,
    spendOverTime,
  }
})
