import { getDb } from '../../db'
import { bills } from '../../db/schema'
import { and, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = await getDb()
  const userId = event.context.user.id
  const id = parseInt(getRouterParam(event, 'id')!)

  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, message: 'Invalid bill ID' })
  }

  const [deleted] = await db
    .delete(bills)
    .where(and(eq(bills.id, id), eq(bills.userId, userId)))
    .returning({ id: bills.id })

  if (!deleted) {
    throw createError({ statusCode: 404, message: 'Bill not found' })
  }

  return { success: true, deletedId: id }
})
