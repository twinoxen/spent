import { getDb } from '../../db'
import { getAvailabilitySummary, listReservesForUser } from '../../utils/reserves'

export default defineEventHandler(async (event) => {
  const db = await getDb()
  const userId = event.context.user.id
  const query = getQuery(event)

  if (query.summary === 'true') {
    return getAvailabilitySummary(db, userId)
  }

  return listReservesForUser(db, userId)
})
