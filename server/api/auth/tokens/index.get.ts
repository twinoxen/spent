import { eq } from 'drizzle-orm'
import { getDb } from '../../../db'
import { apiTokens } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const db = await getDb()
  const tokens = await db
    .select({ id: apiTokens.id, name: apiTokens.name, createdAt: apiTokens.createdAt })
    .from(apiTokens)
    .where(eq(apiTokens.userId, user.id))
    .orderBy(apiTokens.createdAt)

  return tokens
})
