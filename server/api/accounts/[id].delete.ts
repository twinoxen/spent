import { getDb } from '../../db'
import { accounts, transactions } from '../../db/schema'
import { and, eq, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const userId = event.context.user.id
  const id = parseInt(getRouterParam(event, 'id')!)

  // Verify the account belongs to this user
  const [account] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
    .limit(1)

  if (!account) {
    throw createError({ statusCode: 404, message: 'Account not found' })
  }

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

  await db
    .delete(accounts)
    .where(eq(accounts.id, id))

  return { success: true }
})
