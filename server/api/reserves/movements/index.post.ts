import { getDb } from '../../../db'
import { addReserveMovement, isValidDateString, validateReserveMovementType } from '../../../utils/reserves'

export default defineEventHandler(async (event) => {
  const db = await getDb()
  const userId = event.context.user.id
  const body = await readBody(event)

  const reserveId = Number(body.reserveId)
  if (!reserveId || Number.isNaN(reserveId)) {
    throw createError({ statusCode: 400, message: 'reserveId is required' })
  }

  if (!isValidDateString(body.date)) {
    throw createError({ statusCode: 400, message: 'date must be YYYY-MM-DD' })
  }

  if (typeof body.amount !== 'number' || body.amount <= 0) {
    throw createError({ statusCode: 400, message: 'amount must be a positive number' })
  }

  if (!validateReserveMovementType(body.type)) {
    throw createError({ statusCode: 400, message: 'type must be contribution, release, or adjustment' })
  }

  return addReserveMovement(db, userId, {
    reserveId,
    date: body.date,
    amount: body.amount,
    type: body.type,
    linkedTransactionId: body.linkedTransactionId ?? null,
    notes: body.notes ?? null,
  })
})
