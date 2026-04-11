import { getDb } from '../../db'
import { bills } from '../../db/schema'

const VALID_OCCURRENCES = ['one_time', 'monthly', 'quarterly', 'annual'] as const

export default defineEventHandler(async (event) => {
  const db = await getDb()
  const userId = event.context.user.id
  const body = await readBody(event)

  if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
    throw createError({ statusCode: 400, message: 'name must be a non-empty string' })
  }

  if (typeof body.amount !== 'number' || body.amount <= 0) {
    throw createError({ statusCode: 400, message: 'amount must be a positive number' })
  }

  if (!VALID_OCCURRENCES.includes(body.occurrence)) {
    throw createError({
      statusCode: 400,
      message: `occurrence must be one of: ${VALID_OCCURRENCES.join(', ')}`,
    })
  }

  if (!body.dueDate || typeof body.dueDate !== 'string' || body.dueDate.trim() === '') {
    throw createError({ statusCode: 400, message: 'dueDate must be a non-empty string' })
  }

  const [bill] = await db.insert(bills).values({
    userId,
    name: body.name.trim(),
    amount: body.amount,
    occurrence: body.occurrence,
    dueDate: body.dueDate.trim(),
    isEndOfMonth: body.isEndOfMonth ?? false,
    spreadMonthly: body.spreadMonthly ?? false,
    isActive: body.isActive ?? true,
    notes: body.notes ?? null,
  }).returning()

  return bill
})
