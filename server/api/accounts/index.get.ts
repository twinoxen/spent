import { getDb } from '../../db'
import { accounts, transactions } from '../../db/schema'
import { eq, sql } from 'drizzle-orm'
import { computeAccountBalance, type RawAccountRow } from '../../utils/computeBalances'

function isMissingOpeningBalanceColumnError(error: unknown): boolean {
  const message = error instanceof Error
    ? error.message
    : (typeof error === 'string' ? error : JSON.stringify(error))

  const lower = message.toLowerCase()
  return lower.includes('is_opening_balance') && lower.includes('does not exist')
}

export default defineEventHandler(async (event) => {
  const db = await getDb()
  const userId = event.context.user.id

  const buildAccountQuery = () => db
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
      anchoredTxAmount: sql<number | null>`(
        with latest_opening as (
          select o.id, o.amount, o.transaction_date
          from transactions o
          where o.account_id = ${accounts.id}
            and o.is_opening_balance = true
          order by o.transaction_date desc, o.id desc
          limit 1
        )
        select case
          when lo.id is null then coalesce(sum(t.amount), 0)
          else lo.amount + coalesce(sum(case
            when t.is_opening_balance = false
              and (t.transaction_date, t.id) > (lo.transaction_date, lo.id)
            then t.amount
            else 0
          end), 0)
        end
        from transactions t
        left join latest_opening lo on true
        where t.account_id = ${accounts.id}
      )`,
      postedTxAmount: sql<number | null>`sum(case when ${transactions.isPending} then 0 else ${transactions.amount} end)`,
      pendingTxAmount: sql<number | null>`sum(case when ${transactions.isPending} then ${transactions.amount} else 0 end)`,
      openingTxAmount: sql<number | null>`(
        select o.amount
        from transactions o
        where o.account_id = ${accounts.id}
          and o.is_opening_balance = true
        order by o.transaction_date desc, o.id desc
        limit 1
      )`,
      openingTxDate: sql<string | null>`(
        select o.transaction_date
        from transactions o
        where o.account_id = ${accounts.id}
          and o.is_opening_balance = true
        order by o.transaction_date desc, o.id desc
        limit 1
      )`,
    })
    .from(accounts)
    .leftJoin(transactions, eq(transactions.accountId, accounts.id))
    .where(eq(accounts.userId, userId))
    .groupBy(accounts.id)
    .orderBy(accounts.name)

  let results
  try {
    results = await buildAccountQuery()
  } catch (error) {
    console.error('[api/accounts] list_accounts query failed', error)
    if (isMissingOpeningBalanceColumnError(error)) {
      console.error('[api/accounts] Missing transactions.is_opening_balance column. Database migrations are missing. Run `npm run db:migrate`.')
    }
    throw error
  }

  return results.map(row => computeAccountBalance(row as RawAccountRow))
})
