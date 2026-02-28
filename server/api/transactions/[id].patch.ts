import { getDb } from '../../db'
import { transactions } from '../../db/schema'
import { eq } from 'drizzle-orm'

interface UpdateTransactionBody {
  categoryId?: number | null
  notes?: string | null
  tags?: string[]
}

export default defineEventHandler(async (event) => {
  const db = getDb()
  const id = Number(event.context.params?.id)
  
  if (!id || isNaN(id)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid transaction ID',
    })
  }
  
  const body = await readBody<UpdateTransactionBody>(event)
  
  // Validate at least one field is being updated
  if (body.categoryId === undefined && body.notes === undefined && body.tags === undefined) {
    throw createError({
      statusCode: 400,
      message: 'No fields to update',
    })
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
  
  // Update transaction
  const [updated] = await db
    .update(transactions)
    .set(updates)
    .where(eq(transactions.id, id))
    .returning()
  
  if (!updated) {
    throw createError({
      statusCode: 404,
      message: 'Transaction not found',
    })
  }
  
  return updated
})
