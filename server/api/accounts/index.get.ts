import { getDb } from '../../db'
import { accounts, transactions } from '../../db/schema'
import { and, eq, gt, sql } from 'drizzle-orm'
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
      txSumAfterSnapshot: sql<number | null>`
        sum(
          case
            when ${accounts.balanceAsOfDate} is not null
              and ${transactions.transactionDate} > ${accounts.balanceAsOfDate}
            then ${transactions.amount}
            else null
          end
        )
      `,
    })
    .from(accounts)
    .leftJoin(transactions, eq(transactions.accountId, accounts.id))
    .where(eq(accounts.userId, userId))
    .groupBy(accounts.id)
    .orderBy(accounts.name)

  return results.map(row => computeAccountBalance(row as RawAccountRow))
})
