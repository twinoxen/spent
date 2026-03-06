import { getDb } from '../../db'
import { accounts, transactions } from '../../db/schema'
import { eq, sql } from 'drizzle-orm'
import { computeAccountBalance, type RawAccountRow } from '../../utils/computeBalances'

export default defineEventHandler(async (event) => {
  const db = await getDb()
  const userId = event.context.user.id

  const results = await db
    .select({
      id: accounts.id,
      name: accounts.name,
      type: accounts.type,
      institution: accounts.institution,
      lastFour: accounts.lastFour,
      color: accounts.color,
      currentBalance: accounts.currentBalance,
      balanceAsOfDate: accounts.balanceAsOfDate,
      creditLimit: accounts.creditLimit,
      apr: accounts.apr,
      createdAt: accounts.createdAt,
      transactionCount: sql<number>`count(${transactions.id})`,
      totalTxAmount: sql<number | null>`sum(${transactions.amount})`,
      postedTxAmount: sql<number | null>`sum(case when ${transactions.isPending} then 0 else ${transactions.amount} end)`,
      pendingTxAmount: sql<number | null>`sum(case when ${transactions.isPending} then ${transactions.amount} else 0 end)`,
      openingTxAmount: sql<number | null>`max(case when ${transactions.isOpeningBalance} then ${transactions.amount} else null end)`,
      openingTxDate: sql<string | null>`max(case when ${transactions.isOpeningBalance} then ${transactions.transactionDate} else null end)`,
    })
    .from(accounts)
    .leftJoin(transactions, eq(transactions.accountId, accounts.id))
    .where(eq(accounts.userId, userId))
    .groupBy(accounts.id)
    .orderBy(accounts.name)

  return results.map(row => computeAccountBalance(row as RawAccountRow))
})
