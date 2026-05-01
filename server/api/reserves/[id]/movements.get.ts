import { getDb } from '../../../db'
import { listReserveMovements } from '../../../utils/reserves'

export default defineEventHandler(async (event) => {
  const db = await getDb()
  const userId = event.context.user.id
  const reserveId = parseInt(getRouterParam(event, 'id')!)

  if (!reserveId || isNaN(reserveId)) {
    throw createError({ statusCode: 400, message: 'Invalid reserve ID' })
  }

  const movements = await listReserveMovements(db, reserveId, userId)
  if (movements === null) {
    throw createError({ statusCode: 404, message: 'Reserve not found' })
  }

  return movements
})
