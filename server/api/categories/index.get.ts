import { getDb } from '../../db'
import { categories } from '../../db/schema'
import { asc, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const userId = event.context.user.id

  const allCategories = await db
    .select()
    .from(categories)
    .where(eq(categories.userId, userId))
    .orderBy(asc(categories.sortOrder), asc(categories.name))

  // Build hierarchical structure
  const categoryMap = new Map()
  const rootCategories: any[] = []

  allCategories.forEach(cat => {
    categoryMap.set(cat.id, { ...cat, children: [] })
  })

  allCategories.forEach(cat => {
    const node = categoryMap.get(cat.id)
    if (cat.parentId === null) {
      rootCategories.push(node)
    } else {
      const parent = categoryMap.get(cat.parentId)
      if (parent) {
        parent.children.push(node)
      }
    }
  })

  return {
    categories: allCategories,
    tree: rootCategories,
  }
})
