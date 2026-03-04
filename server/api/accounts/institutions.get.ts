import { getDb } from '../../db'
import { accounts } from '../../db/schema'
import { eq, isNotNull, asc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = await getDb()
  const userId = event.context.user.id

  const rows = await db
    .selectDistinct({ institution: accounts.institution })
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .orderBy(asc(accounts.institution))

  return rows
    .map(r => r.institution)
    .filter((v): v is string => v !== null && v.trim() !== '')
})
