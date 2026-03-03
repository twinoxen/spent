import { getDb } from '../../db'
import { transactions, merchants, categories, accounts } from '../../db/schema'
import { eq, desc } from 'drizzle-orm'
import { parseTransactionFilters, buildTransactionWhereClause } from '../../utils/transactionFilters'
import { toCsv } from '../../utils/exportFormats'

export default defineEventHandler(async (event) => {
  const db = await getDb()
  const userId = event.context.user.id

  const filters = parseTransactionFilters(getQuery(event))

  const userAccountIds = db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.userId, userId))

  const whereClause = buildTransactionWhereClause(userAccountIds, filters)

  const rows = await db
    .select({
      transactionDate: transactions.transactionDate,
      clearingDate: transactions.clearingDate,
      description: transactions.description,
      merchant: merchants.normalizedName,
      category: categories.name,
      type: transactions.type,
      amount: transactions.amount,
      purchasedBy: transactions.purchasedBy,
      account: accounts.name,
      notes: transactions.notes,
      tags: transactions.tags,
    })
    .from(transactions)
    .leftJoin(merchants, eq(transactions.merchantId, merchants.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(whereClause)
    .orderBy(desc(transactions.transactionDate), desc(transactions.id))

  const csv = toCsv(rows, [
    { header: 'Date', value: r => r.transactionDate },
    { header: 'Description', value: r => r.description },
    { header: 'Merchant', value: r => r.merchant },
    { header: 'Category', value: r => r.category },
    { header: 'Type', value: r => r.type },
    { header: 'Amount', value: r => r.amount },
    { header: 'Purchased By', value: r => r.purchasedBy },
    { header: 'Account', value: r => r.account },
    { header: 'Notes', value: r => r.notes },
    { header: 'Tags', value: r => r.tags?.join(', ') },
    { header: 'Clearing Date', value: r => r.clearingDate },
  ])

  const filename = `transactions-${new Date().toISOString().split('T')[0]}.csv`
  setResponseHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)

  return csv
})
