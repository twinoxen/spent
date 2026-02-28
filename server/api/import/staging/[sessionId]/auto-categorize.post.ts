import { getDb } from '../../../../db'
import { stagingTransactions, categories, importSessions, accounts } from '../../../../db/schema'
import { and, eq, isNull, or } from 'drizzle-orm'
import { autoCategorizeMerchant } from '../../../../utils/categorizer'
import { createCategorizerStrategy, type CategorizationInput } from '../../../../utils/llmCategorizer'

export default defineEventHandler(async (event) => {
  const db = await getDb()
  const userId = event.context.user.id
  const config = useRuntimeConfig()
  const sessionId = Number(event.context.params?.sessionId)

  if (!sessionId || isNaN(sessionId)) {
    throw createError({ statusCode: 400, message: 'Invalid session ID' })
  }

  const [session] = await db
    .select({ id: importSessions.id, accountId: importSessions.accountId })
    .from(importSessions)
    .where(eq(importSessions.id, sessionId))
    .limit(1)

  if (!session) {
    throw createError({ statusCode: 404, message: 'Import session not found' })
  }

  // Verify the session's account belongs to this user
  const [account] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, session.accountId), eq(accounts.userId, userId)))
    .limit(1)

  if (!account) {
    throw createError({ statusCode: 403, message: 'Access denied' })
  }

  const [uncategorizedCategory] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.name, 'Uncategorized'), eq(categories.userId, userId)))
    .limit(1)

  const uncategorizedId = uncategorizedCategory?.id ?? null

  const whereClause = uncategorizedId
    ? or(isNull(stagingTransactions.categoryId), eq(stagingTransactions.categoryId, uncategorizedId))
    : isNull(stagingTransactions.categoryId)

  const rows = await db
    .select({
      id: stagingTransactions.id,
      merchantName: stagingTransactions.merchantName,
      description: stagingTransactions.description,
      amount: stagingTransactions.amount,
      type: stagingTransactions.type,
      sourceCategory: stagingTransactions.sourceCategory,
    })
    .from(stagingTransactions)
    .where(and(eq(stagingTransactions.importSessionId, sessionId), whereClause))

  if (rows.length === 0) {
    return { categorized: 0, total: 0 }
  }

  const allCategories = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(eq(categories.userId, userId))

  const llmStrategy = createCategorizerStrategy({ openaiApiKey: config.openaiApiKey })
  const llmCache = new Map<string, number | null>()

  const llmFallback = async (merchantName: string, row: typeof rows[number]): Promise<number | null> => {
    if (!llmStrategy) return null
    if (llmCache.has(merchantName)) return llmCache.get(merchantName) ?? null

    const input: CategorizationInput = {
      merchantName,
      description: row.description,
      amount: row.amount,
      type: row.type,
      sourceCategory: row.sourceCategory ?? undefined,
      categories: allCategories,
    }

    const result = await llmStrategy.categorize(input)
    llmCache.set(merchantName, result)
    return result
  }

  let categorized = 0

  for (const row of rows) {
    const categoryId = await autoCategorizeMerchant(
      row.merchantName,
      row.description,
      row.sourceCategory ?? undefined,
      (name) => llmFallback(name, row),
      userId
    )

    if (categoryId !== null && categoryId !== uncategorizedId) {
      await db
        .update(stagingTransactions)
        .set({ categoryId })
        .where(eq(stagingTransactions.id, row.id))

      categorized++
    }
  }

  return { categorized, total: rows.length }
})
