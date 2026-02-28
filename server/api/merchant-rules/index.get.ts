import { getDb } from '../../db'
import { merchantRules, categories } from '../../db/schema'
import { and, eq, desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = await getDb()
  const userId = event.context.user.id
  const query = getQuery(event)

  const categoryId = query.categoryId ? Number(query.categoryId) : undefined

  const conditions = [eq(merchantRules.userId, userId)]
  if (categoryId) {
    conditions.push(eq(merchantRules.categoryId, categoryId))
  }

  const results = await db
    .select({
      id: merchantRules.id,
      pattern: merchantRules.pattern,
      priority: merchantRules.priority,
      createdAt: merchantRules.createdAt,
      category: {
        id: categories.id,
        name: categories.name,
        color: categories.color,
      },
    })
    .from(merchantRules)
    .leftJoin(categories, eq(merchantRules.categoryId, categories.id))
    .where(and(...conditions))
    .orderBy(desc(merchantRules.priority), merchantRules.pattern)

  return results
})
