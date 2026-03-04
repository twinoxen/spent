import { eq } from 'drizzle-orm'
import { getDb } from '../../db'
import { users } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const db = await getDb()
  await db
    .update(users)
    .set({ mcpTokenJti: null, mcpTokenIssuedAt: null })
    .where(eq(users.id, user.id))

  setResponseStatus(event, 204)
  return null
})
