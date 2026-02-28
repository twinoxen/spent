import { getDb } from '../../db'
import { transactions, accounts } from '../../db/schema'
import { and, eq, inArray, sql, type SQL } from 'drizzle-orm'

// Stored dates are MM/DD/YYYY — derive ISO string for comparisons
const isoDate = (col: any) =>
  sql`(substr(${col}, 7, 4) || '-' || substr(${col}, 1, 2) || '-' || substr(${col}, 4, 2))`

export default defineEventHandler(async (event) => {
  const db = await getDb()
  const userId = event.context.user.id
  const query = getQuery(event)

  const purchasedBy = query.purchasedBy as string | undefined
  const accountIdsParam = query.accountIds as string | undefined
  const accountIds = accountIdsParam
    ? accountIdsParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
    : query.accountId ? [parseInt(query.accountId as string)] : []

  // Subquery: IDs of accounts belonging to this user
  const userAccountIds = db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.userId, userId))

  const conditions: SQL[] = [
    sql`${transactions.type} != 'Payment'`,
    inArray(transactions.accountId, userAccountIds),
  ]

  if (query.year && query.month) {
    // Single-month mode
    const year = query.year as string
    const month = (query.month as string).padStart(2, '0')
    conditions.push(sql`substr(${transactions.transactionDate}, 7, 4) = ${year}`)
    conditions.push(sql`substr(${transactions.transactionDate}, 1, 2) = ${month}`)
  } else {
    // Date-range mode (or all time if neither is provided)
    const startDate = query.startDate as string | undefined
    const endDate = query.endDate as string | undefined
    if (startDate) conditions.push(sql`${isoDate(transactions.transactionDate)} >= ${startDate}`)
    if (endDate) conditions.push(sql`${isoDate(transactions.transactionDate)} <= ${endDate}`)
  }

  if (purchasedBy) conditions.push(eq(transactions.purchasedBy, purchasedBy))
  if (accountIds.length === 1 && accountIds[0] !== undefined) {
    conditions.push(eq(transactions.accountId, accountIds[0]))
  } else if (accountIds.length > 1) {
    conditions.push(inArray(transactions.accountId, accountIds))
  }

  // Always group by full ISO date so the result works for both single and multi-month views
  const fullDate = sql<string>`(substr(${transactions.transactionDate}, 7, 4) || '-' || substr(${transactions.transactionDate}, 1, 2) || '-' || substr(${transactions.transactionDate}, 4, 2))`

  const rows = await db
    .select({
      date: fullDate,
      total: sql<number>`sum(${transactions.amount})`,
      count: sql<number>`count(*)`,
    })
    .from(transactions)
    .where(and(...conditions))
    .groupBy(fullDate)
    .orderBy(fullDate)

  return { days: rows }
})
