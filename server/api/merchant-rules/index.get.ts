import { getDb } from '../../db'
import { merchantRules, categories } from '../../db/schema'
import { eq, desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const query = getQuery(event)
  
  const categoryId = query.categoryId ? Number(query.categoryId) : undefined
  
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
    .where(categoryId ? eq(merchantRules.categoryId, categoryId) : undefined)
    .orderBy(desc(merchantRules.priority), merchantRules.pattern)
  
  return results
})
