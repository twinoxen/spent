import { eq } from 'drizzle-orm'
import { getDb } from '../../db'
import { users } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const db = await getDb()
  const [row] = await db
    .select({ mcpTokenIssuedAt: users.mcpTokenIssuedAt, mcpTokenJti: users.mcpTokenJti })
    .from(users)
    .where(eq(users.id, user.id))

  return {
    active: !!row?.mcpTokenJti,
    issuedAt: row?.mcpTokenIssuedAt?.toISOString() ?? null,
  }
})
