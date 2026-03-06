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
      anchoredTxAmount: sql<number | null>`(
        with latest_opening as (
          select o.id, o.amount, o.transaction_date, coalesce(o.created_at, to_timestamp(0)) as created_at
          from transactions o
          where o.account_id = ${accounts.id}
            and o.is_opening_balance = true
          order by coalesce(o.created_at, to_timestamp(0)) desc, o.id desc
          limit 1
        )
        select case
          when lo.id is null then coalesce(sum(t.amount), 0)
          else lo.amount + coalesce(sum(case
            when t.is_opening_balance = false
              and (
                t.transaction_date,
                coalesce(t.created_at, to_timestamp(0)),
                t.id
              ) > (
                lo.transaction_date,
                lo.created_at,
                lo.id
              )
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
        order by coalesce(o.created_at, to_timestamp(0)) desc, o.id desc
        limit 1
      )`,
      openingTxDate: sql<string | null>`(
        select o.transaction_date
        from transactions o
        where o.account_id = ${accounts.id}
          and o.is_opening_balance = true
        order by coalesce(o.created_at, to_timestamp(0)) desc, o.id desc
        limit 1
      )`,
    })
    .from(accounts)
    .leftJoin(transactions, eq(transactions.accountId, accounts.id))
    .where(eq(accounts.userId, userId))
    .groupBy(accounts.id)
    .orderBy(accounts.name)

  return results.map(row => computeAccountBalance(row as RawAccountRow))
})
