import { getDb } from '../../db'
import { getAvailabilitySummary } from '../../utils/reserves'

export default defineEventHandler(async (event) => {
  const db = await getDb()
  const userId = event.context.user.id

  return getAvailabilitySummary(db, userId)
})
