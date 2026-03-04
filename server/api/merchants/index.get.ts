import { getDb } from '../../db'
import { merchants } from '../../db/schema'
import { eq, ilike, or } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = await getDb()
  const userId = event.context.user.id
  const query = getQuery(event)
  const search = query.search as string | undefined

  let rows = db
    .select({
      id: merchants.id,
      normalizedName: merchants.normalizedName,
      rawNames: merchants.rawNames,
    })
    .from(merchants)
    .where(eq(merchants.userId, userId))

  const results = await rows

  if (search && search.trim()) {
    const lower = search.toLowerCase()
    return results.filter(m =>
      m.normalizedName.toLowerCase().includes(lower) ||
      (m.rawNames as string[]).some(r => r.toLowerCase().includes(lower)),
    )
  }

  return results
})
