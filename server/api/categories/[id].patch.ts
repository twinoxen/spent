import { getDb } from '../../db'
import { categories } from '../../db/schema'
import { eq } from 'drizzle-orm'

interface UpdateCategoryBody {
  name?: string
  parentId?: number | null
  color?: string | null
  icon?: string | null
  sortOrder?: number
}

export default defineEventHandler(async (event) => {
  const db = getDb()
  const id = Number(event.context.params?.id)
  
  if (!id || isNaN(id)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid category ID',
    })
  }
  
  const body = await readBody<UpdateCategoryBody>(event)
  
  const updates: Partial<typeof categories.$inferInsert> = {}
  
  if (body.name !== undefined) {
    if (body.name.trim() === '') {
      throw createError({
        statusCode: 400,
        message: 'Category name cannot be empty',
      })
    }
    updates.name = body.name.trim()
  }
  
  if (body.parentId !== undefined) {
    updates.parentId = body.parentId
  }
  
  if (body.color !== undefined) {
    updates.color = body.color
  }
  
  if (body.icon !== undefined) {
    updates.icon = body.icon
  }
  
  if (body.sortOrder !== undefined) {
    updates.sortOrder = body.sortOrder
  }
  
  const [updated] = await db
    .update(categories)
    .set(updates)
    .where(eq(categories.id, id))
    .returning()
  
  if (!updated) {
    throw createError({
      statusCode: 404,
      message: 'Category not found',
    })
  }
  
  return updated
})
