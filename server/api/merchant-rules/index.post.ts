import { getDb } from '../../db'
import { merchantRules } from '../../db/schema'

interface CreateMerchantRuleBody {
  pattern: string
  categoryId: number
  priority?: number
}

export default defineEventHandler(async (event) => {
  const db = await getDb()
  const userId = event.context.user.id
  const body = await readBody<CreateMerchantRuleBody>(event)

  if (!body.pattern || body.pattern.trim() === '') {
    throw createError({
      statusCode: 400,
      message: 'Pattern is required',
    })
  }

  if (!body.categoryId) {
    throw createError({
      statusCode: 400,
      message: 'Category ID is required',
    })
  }

  const [newRule] = await db.insert(merchantRules).values({
    userId,
    pattern: body.pattern.trim().toLowerCase(),
    categoryId: body.categoryId,
    priority: body.priority || 100,
  }).returning()

  return newRule
})
