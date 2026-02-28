import { getDb } from '../../db'
import { accounts, transactions } from '../../db/schema'
import { eq, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const id = parseInt(getRouterParam(event, 'id')!)

  const countRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactions)
    .where(eq(transactions.accountId, id))

  const count = Number(countRows[0]?.count ?? 0)
  if (count > 0) {
    throw createError({
      statusCode: 400,
      message: `Cannot delete account: it has ${count} transaction(s). Remove transactions first.`,
    })
  }

  const [deleted] = await db
    .delete(accounts)
    .where(eq(accounts.id, id))
    .returning()

  if (!deleted) {
    throw createError({ statusCode: 404, message: 'Account not found' })
  }

  return { success: true }
})
