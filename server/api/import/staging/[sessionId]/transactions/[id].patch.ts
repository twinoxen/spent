import { getDb } from '../../../../../db'
import { stagingTransactions, importSessions, accounts } from '../../../../../db/schema'
import { and, eq } from 'drizzle-orm'

interface UpdateStagingBody {
  categoryId?: number | null
  isSelected?: boolean
  amount?: number
}

export default defineEventHandler(async (event) => {
  const db = await getDb()
  const userId = event.context.user.id
  const sessionId = Number(event.context.params?.sessionId)
  const id = Number(event.context.params?.id)

  if (!sessionId || isNaN(sessionId) || !id || isNaN(id)) {
    throw createError({ statusCode: 400, message: 'Invalid session or transaction ID' })
  }

  // Verify the session's account belongs to this user
  const [session] = await db
    .select({ id: importSessions.id, accountId: importSessions.accountId })
    .from(importSessions)
    .where(eq(importSessions.id, sessionId))
    .limit(1)

  if (!session) {
    throw createError({ statusCode: 404, message: 'Import session not found' })
  }

  const [account] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, session.accountId), eq(accounts.userId, userId)))
    .limit(1)

  if (!account) {
    throw createError({ statusCode: 403, message: 'Access denied' })
  }

  const body = await readBody<UpdateStagingBody>(event)

  if (body.categoryId === undefined && body.isSelected === undefined && body.amount === undefined) {
    throw createError({ statusCode: 400, message: 'No fields to update' })
  }

  const updates: Partial<typeof stagingTransactions.$inferInsert> = {}
  if (body.categoryId !== undefined) updates.categoryId = body.categoryId
  if (body.isSelected !== undefined) updates.isSelected = body.isSelected
  if (body.amount !== undefined) {
    if (typeof body.amount !== 'number' || isNaN(body.amount)) {
      throw createError({ statusCode: 400, message: 'Invalid amount value' })
    }
    updates.amount = body.amount
  }

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
