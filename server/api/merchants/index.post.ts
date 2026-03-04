import { getDb } from '../../db'
import { merchants } from '../../db/schema'
import { and, eq } from 'drizzle-orm'

interface CreateMerchantBody {
  name: string
}

export default defineEventHandler(async (event) => {
  const db = await getDb()
  const userId = event.context.user.id
  const body = await readBody<CreateMerchantBody>(event)

  if (!body.name || !body.name.trim()) {
    throw createError({ statusCode: 400, message: 'Merchant name is required' })
  }

  const name = body.name.trim()

  // Return existing merchant if name already taken
  const [existing] = await db
    .select()
    .from(merchants)
    .where(and(eq(merchants.normalizedName, name), eq(merchants.userId, userId)))
    .limit(1)

  if (existing) return existing

  const [created] = await db
    .insert(merchants)
    .values({ userId, normalizedName: name, rawNames: [] })
    .returning()

  return created
})
