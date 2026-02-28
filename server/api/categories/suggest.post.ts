import { getDb } from '../../db'
import { transactions, merchants, categories, accounts } from '../../db/schema'
import { and, eq, isNull, or, inArray } from 'drizzle-orm'
import { createCategorizerStrategy, type MerchantSummary } from '../../utils/llmCategorizer'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const userId = event.context.user.id
  const llmStrategy = createCategorizerStrategy({ openaiApiKey: config.openaiApiKey })

  if (!llmStrategy?.suggestNewCategories) {
    throw createError({ statusCode: 503, message: 'LLM categorization is not configured. Set OPENAI_API_KEY to enable this feature.' })
  }

  const db = getDb()

  // Scope to user's categories
  const [uncategorizedCategory] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.name, 'Uncategorized'), eq(categories.userId, userId)))
    .limit(1)

  const uncategorizedId = uncategorizedCategory?.id ?? null

  const categoryWhereClause = uncategorizedId
    ? or(isNull(transactions.categoryId), eq(transactions.categoryId, uncategorizedId))
    : isNull(transactions.categoryId)

  // Scope transactions to user's accounts via subquery
  const userAccountIds = db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.userId, userId))

  const uncategorized = await db
    .select({
      description: transactions.description,
      amount: transactions.amount,
      merchantId: transactions.merchantId,
    })
    .from(transactions)
    .where(and(inArray(transactions.accountId, userAccountIds), categoryWhereClause))

  if (uncategorized.length === 0) {
    return { suggestions: [] }
  }

  const [allMerchantsResult, allCategoriesResult] = await Promise.all([
    db.select({ id: merchants.id, normalizedName: merchants.normalizedName })
      .from(merchants)
      .where(eq(merchants.userId, userId)),
    db.select({ name: categories.name })
      .from(categories)
      .where(eq(categories.userId, userId)),
  ])

  const merchantMap = new Map(allMerchantsResult.map(m => [m.id, m.normalizedName]))
  const existingCategoryNames = allCategoriesResult.map(c => c.name)

  // Group transactions by merchant to produce summaries
  const summaryMap = new Map<string, MerchantSummary>()

  for (const tx of uncategorized) {
    const name = tx.merchantId ? (merchantMap.get(tx.merchantId) ?? tx.description) : tx.description

    const existing = summaryMap.get(name)
    if (existing) {
      existing.transactionCount++
      existing.totalAmount += tx.amount
      if (existing.sampleDescriptions.length < 2 && !existing.sampleDescriptions.includes(tx.description)) {
        existing.sampleDescriptions.push(tx.description)
      }
    } else {
      summaryMap.set(name, {
        normalizedName: name,
        transactionCount: 1,
        totalAmount: tx.amount,
        sampleDescriptions: [tx.description],
      })
    }
  }

  const merchantSummaries = Array.from(summaryMap.values())
    .sort((a, b) => b.totalAmount - a.totalAmount)

  const suggestions = await llmStrategy.suggestNewCategories(merchantSummaries, existingCategoryNames)

  return { suggestions }
})
