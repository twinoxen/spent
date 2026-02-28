import { getDb } from '../../db'
import { categories } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const id = Number(event.context.params?.id)
  
  if (!id || isNaN(id)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid category ID',
    })
  }
  
  const [deleted] = await db
    .delete(categories)
    .where(eq(categories.id, id))
    .returning()
  
  if (!deleted) {
    throw createError({
      statusCode: 404,
      message: 'Category not found',
    })
  }
  
  return { success: true, deleted }
})
