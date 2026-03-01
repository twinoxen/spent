import { getDb } from '../../db'
import { accounts } from '../../db/schema'
import { and, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = await getDb()
  const userId = event.context.user.id
  const id = parseInt(getRouterParam(event, 'id')!)

  const [deleted] = await db
    .delete(accounts)
    .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
    .returning({ id: accounts.id })

  if (!deleted) {
    throw createError({ statusCode: 404, message: 'Account not found' })
  }

  return { success: true }
})
