import { getDb } from '../../db'
import { transactions, accounts } from '../../db/schema'
import { and, eq } from 'drizzle-orm'

interface UpdateTransactionBody {
  transactionDate?: string
  clearingDate?: string | null
  amount?: number
  type?: string
  description?: string
  merchantId?: number | null
  categoryId?: number | null
  purchasedBy?: string | null
  notes?: string | null
  tags?: string[]
  isPending?: boolean
  accountId?: number
}

export default defineEventHandler(async (event) => {
  const db = await getDb()
  const userId = event.context.user.id
  const id = Number(event.context.params?.id)

  if (!id || isNaN(id)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid transaction ID',
    })
  }

  const body = await readBody<UpdateTransactionBody>(event)

  const allowedFields = ['transactionDate', 'clearingDate', 'amount', 'type', 'description', 'merchantId', 'categoryId', 'purchasedBy', 'notes', 'tags', 'isPending', 'accountId']
  const hasUpdate = allowedFields.some(f => (body as any)[f] !== undefined)

  if (!hasUpdate) {
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

  // If accountId is being changed, verify the new account also belongs to this user
  if (body.accountId !== undefined && body.accountId !== tx.accountId) {
    const [targetAccount] = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.id, body.accountId), eq(accounts.userId, userId)))
      .limit(1)

    if (!targetAccount) {
      throw createError({ statusCode: 403, message: 'Target account not found or access denied' })
    }
  }

  const updates: Partial<typeof transactions.$inferInsert> = {}

  if (body.transactionDate !== undefined) updates.transactionDate = body.transactionDate
  if (body.clearingDate !== undefined) updates.clearingDate = body.clearingDate
  if (body.amount !== undefined) updates.amount = body.amount
  if (body.type !== undefined) updates.type = body.type
  if (body.description !== undefined) updates.description = body.description
  if (body.merchantId !== undefined) updates.merchantId = body.merchantId
  if (body.categoryId !== undefined) updates.categoryId = body.categoryId
  if (body.purchasedBy !== undefined) updates.purchasedBy = body.purchasedBy
  if (body.notes !== undefined) updates.notes = body.notes
  if (body.tags !== undefined) updates.tags = body.tags as any
  if (body.isPending !== undefined) updates.isPending = body.isPending
  if (body.accountId !== undefined) updates.accountId = body.accountId

  const [updated] = await db
    .update(transactions)
    .set(updates)
    .where(eq(transactions.id, id))
    .returning()

  return updated
})
