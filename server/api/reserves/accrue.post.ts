import { getDb } from '../../db'
import { autoAccrueReserves, isValidDateString } from '../../utils/reserves'

export default defineEventHandler(async (event) => {
  const db = await getDb()
  const userId = event.context.user.id
  const body = await readBody(event)
  const throughDate = body.throughDate ?? new Date().toISOString().slice(0, 10)

  if (!isValidDateString(throughDate)) {
    throw createError({ statusCode: 400, message: 'throughDate must be YYYY-MM-DD' })
  }

  const movements = await autoAccrueReserves(db, userId, throughDate)
  return { accrued: movements.length, movements }
})
