import { getDb } from '../../db'
import { categories } from '../../db/schema'

interface CreateCategoryBody {
  name: string
  parentId?: number | null
  color?: string
  icon?: string
  sortOrder?: number
}

export default defineEventHandler(async (event) => {
  const db = await getDb()
  const userId = event.context.user.id
  const body = await readBody<CreateCategoryBody>(event)

  if (!body.name || body.name.trim() === '') {
    throw createError({
      statusCode: 400,
      message: 'Category name is required',
    })
  }

  const [newCategory] = await db.insert(categories).values({
    userId,
    name: body.name.trim(),
    parentId: body.parentId || null,
    color: body.color || null,
    icon: body.icon || null,
    sortOrder: body.sortOrder || 0,
  }).returning()

  return newCategory
})
