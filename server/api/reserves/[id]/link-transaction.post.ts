import { getDb } from '../../../db'
import { addReserveMovement } from '../../../utils/reserves'

export default defineEventHandler(async (event) => {
  const db = await getDb()
  const userId = event.context.user.id
  const reserveId = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)

  if (!reserveId || Number.isNaN(reserveId)) {
    throw createError({ statusCode: 400, message: 'Invalid reserve ID' })
  }

  if (typeof body.transactionId !== 'number' || body.transactionId <= 0) {
    throw createError({ statusCode: 400, message: 'transactionId must be a positive number' })
  }

  if (typeof body.amount !== 'number' || body.amount <= 0) {
    throw createError({ statusCode: 400, message: 'amount must be a positive number' })
  }

  const date = typeof body.date === 'string' && body.date.trim()
    ? body.date.trim()
    : new Date().toISOString().slice(0, 10)

  return addReserveMovement(db, userId, {
    reserveId,
    date,
    amount: body.amount,
    type: 'release',
    linkedTransactionId: body.transactionId,
    notes: body.notes ?? 'Released reserve for linked payment',
  })
})
