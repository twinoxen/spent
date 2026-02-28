import { getDb } from '../../db'
import { transactions, accounts } from '../../db/schema'
import { and, eq } from 'drizzle-orm'

interface UpdateTransactionBody {
  categoryId?: number | null
  notes?: string | null
  tags?: string[]
}

export default defineEventHandler(async (event) => {
  const db = getDb()
  const userId = event.context.user.id
  const id = Number(event.context.params?.id)

  if (!id || isNaN(id)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid transaction ID',
    })
  }

  const body = await readBody<UpdateTransactionBody>(event)

  if (body.categoryId === undefined && body.notes === undefined && body.tags === undefined) {
    throw createError({
      statusCode: 400,
      message: 'No fields to update',
    })
  }

  // Verify the transaction belongs to one of the user's accounts
  const [tx] = await db
    .select({ id: transactions.id, accountId: transactions.accountId })
    .from(transactions)
    .where(eq(transactions.id, id))
    .limit(1)

  if (!tx) {
    throw createError({ statusCode: 404, message: 'Transaction not found' })
  }

  const [account] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, tx.accountId), eq(accounts.userId, userId)))
    .limit(1)

  if (!account) {
    throw createError({ statusCode: 403, message: 'Access denied' })
  }

  // Build update object
  const updates: Partial<typeof transactions.$inferInsert> = {}

  if (body.categoryId !== undefined) {
    updates.categoryId = body.categoryId
  }

  if (body.notes !== undefined) {
    updates.notes = body.notes
  }

  if (body.tags !== undefined) {
    updates.tags = body.tags as any
  }

  const [updated] = await db
    .update(transactions)
    .set(updates)
    .where(eq(transactions.id, id))
    .returning()

  return updated
})
