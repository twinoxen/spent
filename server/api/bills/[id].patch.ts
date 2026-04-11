import { getDb } from '../../db'
import { bills } from '../../db/schema'
import { and, eq } from 'drizzle-orm'

const VALID_OCCURRENCES = ['one_time', 'monthly', 'quarterly', 'annual'] as const

export default defineEventHandler(async (event) => {
  const db = await getDb()
  const userId = event.context.user.id
  const id = parseInt(getRouterParam(event, 'id')!)

  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, message: 'Invalid bill ID' })
  }

  const body = await readBody(event)
  const updates: Partial<typeof bills.$inferInsert> = {}

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim() === '') {
      throw createError({ statusCode: 400, message: 'name must be a non-empty string' })
    }
    updates.name = body.name.trim()
  }

  if (body.amount !== undefined) {
    if (typeof body.amount !== 'number' || body.amount <= 0) {
      throw createError({ statusCode: 400, message: 'amount must be a positive number' })
    }
    updates.amount = body.amount
  }

  if (body.occurrence !== undefined) {
    if (!VALID_OCCURRENCES.includes(body.occurrence)) {
      throw createError({
        statusCode: 400,
        message: `occurrence must be one of: ${VALID_OCCURRENCES.join(', ')}`,
      })
    }
    updates.occurrence = body.occurrence
  }

  if (body.dueDate !== undefined) {
    if (typeof body.dueDate !== 'string' || body.dueDate.trim() === '') {
      throw createError({ statusCode: 400, message: 'dueDate must be a non-empty string' })
    }
    updates.dueDate = body.dueDate.trim()
  }

  if (body.isEndOfMonth !== undefined) updates.isEndOfMonth = body.isEndOfMonth
  if (body.spreadMonthly !== undefined) updates.spreadMonthly = body.spreadMonthly
  if (body.isActive !== undefined) updates.isActive = body.isActive
  if (body.notes !== undefined) updates.notes = body.notes

  const [updated] = await db
    .update(bills)
    .set(updates)
    .where(and(eq(bills.id, id), eq(bills.userId, userId)))
    .returning()

  if (!updated) {
    throw createError({ statusCode: 404, message: 'Bill not found' })
  }

  return updated
})
