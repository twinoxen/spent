import { getDb } from '../../db'
import { categories } from '../../db/schema'
import { and, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const userId = event.context.user.id
  const id = Number(event.context.params?.id)

  if (!id || isNaN(id)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid category ID',
    })
  }

  const [deleted] = await db
    .delete(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)))
    .returning()

  if (!deleted) {
    throw createError({
      statusCode: 404,
      message: 'Category not found',
    })
  }

  return { success: true, deleted }
})
