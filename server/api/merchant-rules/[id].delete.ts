import { getDb } from '../../db'
import { merchantRules } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const id = Number(event.context.params?.id)
  
  if (!id || isNaN(id)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid rule ID',
    })
  }
  
  const [deleted] = await db
    .delete(merchantRules)
    .where(eq(merchantRules.id, id))
    .returning()
  
  if (!deleted) {
    throw createError({
      statusCode: 404,
      message: 'Merchant rule not found',
    })
  }
  
  return { success: true, deleted }
})
