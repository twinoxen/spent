import { and, eq } from 'drizzle-orm'
import { getDb } from '../../../db'
import { apiTokens } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, message: 'Invalid token ID' })
  }

  const db = await getDb()
  const deleted = await db
    .delete(apiTokens)
    .where(and(eq(apiTokens.id, id), eq(apiTokens.userId, user.id)))
    .returning({ id: apiTokens.id })

  if (!deleted.length) {
    throw createError({ statusCode: 404, message: 'Token not found' })
  }

  return { success: true }
})
