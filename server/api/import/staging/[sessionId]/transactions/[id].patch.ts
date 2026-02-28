import { getDb } from '../../../../../db'
import { stagingTransactions } from '../../../../../db/schema'
import { eq, and } from 'drizzle-orm'

interface UpdateStagingBody {
  categoryId?: number | null
  isSelected?: boolean
}

export default defineEventHandler(async (event) => {
  const db = getDb()
  const sessionId = Number(event.context.params?.sessionId)
  const id = Number(event.context.params?.id)

  if (!sessionId || isNaN(sessionId) || !id || isNaN(id)) {
    throw createError({ statusCode: 400, message: 'Invalid session or transaction ID' })
  }

  const body = await readBody<UpdateStagingBody>(event)

  if (body.categoryId === undefined && body.isSelected === undefined) {
    throw createError({ statusCode: 400, message: 'No fields to update' })
  }

  const updates: Partial<typeof stagingTransactions.$inferInsert> = {}
  if (body.categoryId !== undefined) updates.categoryId = body.categoryId
  if (body.isSelected !== undefined) updates.isSelected = body.isSelected

  const [updated] = await db
    .update(stagingTransactions)
    .set(updates)
    .where(and(eq(stagingTransactions.id, id), eq(stagingTransactions.importSessionId, sessionId)))
    .returning()

  if (!updated) {
    throw createError({ statusCode: 404, message: 'Staging transaction not found' })
  }

  return updated
})
