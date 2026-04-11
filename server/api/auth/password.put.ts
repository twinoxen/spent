import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { getDb } from '../../db'
import { users } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const userId = event.context.user?.id
  if (!userId) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody(event)
  const { currentPassword, newPassword } = body

  if (!currentPassword || !newPassword) {
    throw createError({ statusCode: 400, message: 'Current and new password are required' })
  }

  if (newPassword.length < 8) {
    throw createError({ statusCode: 400, message: 'New password must be at least 8 characters' })
  }

  const db = await getDb()
  const [user] = await db.select().from(users).where(eq(users.id, userId))

  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw createError({ statusCode: 401, message: 'Current password is incorrect' })
  }

  const passwordHash = await bcrypt.hash(newPassword, 12)
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId))

  return { success: true }
})
