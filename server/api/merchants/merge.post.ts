import { getDb } from '../../db'
import { merchants, transactions, accounts } from '../../db/schema'
import { and, eq, inArray, sql } from 'drizzle-orm'

interface MergeMerchantsBody {
  sourceMerchantId: number
  // Provide one of:
  targetMerchantId?: number
  newMerchantName?: string
}

export default defineEventHandler(async (event) => {
  const db = await getDb()
  const userId = event.context.user.id
  const body = await readBody<MergeMerchantsBody>(event)

  if (!body.sourceMerchantId) {
    throw createError({ statusCode: 400, message: 'sourceMerchantId is required' })
  }
  if (!body.targetMerchantId && !body.newMerchantName) {
    throw createError({ statusCode: 400, message: 'Either targetMerchantId or newMerchantName is required' })
  }

  // Verify source merchant belongs to user
  const [source] = await db
    .select({ id: merchants.id, normalizedName: merchants.normalizedName, rawNames: merchants.rawNames })
    .from(merchants)
    .where(and(eq(merchants.id, body.sourceMerchantId), eq(merchants.userId, userId)))
    .limit(1)

  if (!source) {
    throw createError({ statusCode: 404, message: 'Source merchant not found' })
  }

  let targetId: number
  let targetRawNames: string[]

  if (body.targetMerchantId) {
    // Merge into existing merchant
    const [target] = await db
      .select({ id: merchants.id, normalizedName: merchants.normalizedName, rawNames: merchants.rawNames })
      .from(merchants)
      .where(and(eq(merchants.id, body.targetMerchantId), eq(merchants.userId, userId)))
      .limit(1)

    if (!target) {
      throw createError({ statusCode: 404, message: 'Target merchant not found' })
    }

    targetId = target.id
    targetRawNames = target.rawNames as string[]
  } else {
    // Find or create merchant with newMerchantName
    const name = body.newMerchantName!.trim()
    const [existing] = await db
      .select({ id: merchants.id, rawNames: merchants.rawNames })
      .from(merchants)
      .where(and(eq(merchants.normalizedName, name), eq(merchants.userId, userId)))
      .limit(1)

    if (existing) {
      targetId = existing.id
      targetRawNames = existing.rawNames as string[]
    } else {
      const [created] = await db
        .insert(merchants)
        .values({ userId, normalizedName: name, rawNames: [] })
        .returning()
      if (!created) throw createError({ statusCode: 500, message: 'Failed to create merchant' })
      targetId = created.id
      targetRawNames = []
    }
  }

  if (targetId === source.id) {
    throw createError({ statusCode: 400, message: 'Source and target merchant are the same' })
  }

  // Merge rawNames: combine source rawNames into target, deduplicated
  const sourceRawNames = source.rawNames as string[]
  const mergedRawNames = Array.from(new Set([...targetRawNames, ...sourceRawNames, source.normalizedName]))

  await db
    .update(merchants)
    .set({ rawNames: mergedRawNames })
    .where(eq(merchants.id, targetId))

  // Get all user account IDs to safely scope the transaction update
  const userAccounts = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.userId, userId))

  const accountIds = userAccounts.map(a => a.id)

  if (accountIds.length > 0) {
    await db
      .update(transactions)
      .set({ merchantId: targetId })
      .where(
        and(
          eq(transactions.merchantId, source.id),
          inArray(transactions.accountId, accountIds),
        ),
      )
  }

  // Delete source merchant (transactions have been migrated)
  await db.delete(merchants).where(eq(merchants.id, source.id))

  // Return the updated target merchant
  const [updated] = await db
    .select()
    .from(merchants)
    .where(eq(merchants.id, targetId))
    .limit(1)

  return updated
})
