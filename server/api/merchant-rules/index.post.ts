import { getDb } from '../../db'
import { merchantRules, transactions, accounts, merchants } from '../../db/schema'
import { and, eq, inArray } from 'drizzle-orm'

interface CreateMerchantRuleBody {
  pattern: string
  categoryId: number
  priority?: number
  merchantId?: number
  applyToExisting?: boolean
}

export default defineEventHandler(async (event) => {
  const db = await getDb()
  const userId = event.context.user.id
  const body = await readBody<CreateMerchantRuleBody>(event)

  if (!body.pattern || body.pattern.trim() === '') {
    throw createError({
      statusCode: 400,
      message: 'Pattern is required',
    })
  }

  if (!body.categoryId) {
    throw createError({
      statusCode: 400,
      message: 'Category ID is required',
    })
  }

  const [newRule] = await db.insert(merchantRules).values({
    userId,
    pattern: body.pattern.trim().toLowerCase(),
    categoryId: body.categoryId,
    priority: body.priority || 100,
  }).returning()

  let affectedCount = 0

  if (body.applyToExisting && body.merchantId) {
    // Verify merchant belongs to user
    const [merchant] = await db
      .select({ id: merchants.id })
      .from(merchants)
      .where(and(eq(merchants.id, body.merchantId), eq(merchants.userId, userId)))
      .limit(1)

    if (merchant) {
      // Get all user account IDs to safely scope the transaction update
      const userAccounts = await db
        .select({ id: accounts.id })
        .from(accounts)
        .where(eq(accounts.userId, userId))

      const accountIds = userAccounts.map(a => a.id)

      if (accountIds.length > 0) {
        const result = await db
          .update(transactions)
          .set({ categoryId: body.categoryId })
          .where(
            and(
              eq(transactions.merchantId, body.merchantId),
              inArray(transactions.accountId, accountIds),
            ),
          )
          .returning({ id: transactions.id })

        affectedCount = result.length
      }
    }
  }

  return { rule: newRule, affectedCount }
})
