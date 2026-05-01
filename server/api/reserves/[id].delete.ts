import { and, eq } from 'drizzle-orm'
import { getDb } from '../../db'
import { reserves } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const db = await getDb()
  const userId = event.context.user.id
  const id = Number(getRouterParam(event, 'id'))

  if (!id || Number.isNaN(id)) {
    throw createError({ statusCode: 400, message: 'Invalid reserve ID' })
  }

  const [deleted] = await db
    .delete(reserves)
    .where(and(eq(reserves.id, id), eq(reserves.userId, userId)))
    .returning({ id: reserves.id })

  if (!deleted) {
    throw createError({ statusCode: 404, message: 'Reserve not found' })
  }

  return { success: true, deletedId: id }
})
