import { getDb } from '../../db'
import { users } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = await getDb()
  const userId = event.context.user.id

  const [deleted] = await db
    .delete(users)
    .where(eq(users.id, userId))
    .returning({ id: users.id })

  if (!deleted) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  // Clear the auth cookie so the client is logged out immediately
  deleteCookie(event, 'auth_token', { path: '/' })

  return { success: true }
})
