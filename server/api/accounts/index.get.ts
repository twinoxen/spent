import { getDb } from '../../db'
import { accounts, transactions } from '../../db/schema'
import { eq, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const userId = event.context.user.id

  const results = await db
    .select({
      id: accounts.id,
      name: accounts.name,
      type: accounts.type,
      institution: accounts.institution,
      lastFour: accounts.lastFour,
      color: accounts.color,
      createdAt: accounts.createdAt,
      transactionCount: sql<number>`count(${transactions.id})`,
    })
    .from(accounts)
    .leftJoin(transactions, eq(transactions.accountId, accounts.id))
    .where(eq(accounts.userId, userId))
    .groupBy(accounts.id)
    .orderBy(accounts.name)

  return results
})
