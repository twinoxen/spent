import { getDb } from '../../db'
import { bills } from '../../db/schema'
import { asc, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = await getDb()
  const userId = event.context.user.id

  return db
    .select()
    .from(bills)
    .where(eq(bills.userId, userId))
    .orderBy(asc(bills.name))
})
