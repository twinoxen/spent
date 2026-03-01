import { getDb } from '../../db'
import { transactions, accounts } from '../../db/schema'
import { and, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = await getDb()
  const userId = event.context.user.id
  const id = parseInt(getRouterParam(event, 'id')!)

  // Verify the transaction belongs to this user by joining through accounts
  const [tx] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(and(eq(transactions.id, id), eq(accounts.userId, userId)))
    .limit(1)

  if (!tx) {
    throw createError({ statusCode: 404, message: 'Transaction not found' })
  }

  await db.delete(transactions).where(eq(transactions.id, id))

  return { success: true }
})
