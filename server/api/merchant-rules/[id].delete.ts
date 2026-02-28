import { getDb } from '../../db'
import { merchantRules } from '../../db/schema'
import { and, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = await getDb()
  const userId = event.context.user.id
  const id = Number(event.context.params?.id)

  if (!id || isNaN(id)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid rule ID',
    })
  }

  const [deleted] = await db
    .delete(merchantRules)
    .where(and(eq(merchantRules.id, id), eq(merchantRules.userId, userId)))
    .returning()

  if (!deleted) {
    throw createError({
      statusCode: 404,
      message: 'Merchant rule not found',
    })
  }

  return { success: true, deleted }
})
