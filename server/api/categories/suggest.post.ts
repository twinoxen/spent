import { getDb } from '../../db'
import { transactions, merchants, categories } from '../../db/schema'
import { eq, isNull, or } from 'drizzle-orm'
import { createCategorizerStrategy, type MerchantSummary } from '../../utils/llmCategorizer'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const llmStrategy = createCategorizerStrategy({ openaiApiKey: config.openaiApiKey })

  if (!llmStrategy?.suggestNewCategories) {
    throw createError({ statusCode: 503, message: 'LLM categorization is not configured. Set OPENAI_API_KEY to enable this feature.' })
  }

  const db = getDb()

  const [uncategorizedCategory] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.name, 'Uncategorized'))
    .limit(1)

  const uncategorizedId = uncategorizedCategory?.id ?? null

  const whereClause = uncategorizedId
    ? or(isNull(transactions.categoryId), eq(transactions.categoryId, uncategorizedId))
    : isNull(transactions.categoryId)

  const uncategorized = await db
    .select({
      description: transactions.description,
      amount: transactions.amount,
      merchantId: transactions.merchantId,
    })
    .from(transactions)
    .where(whereClause)

  if (uncategorized.length === 0) {
    return { suggestions: [] }
  }

  const [allMerchantsResult, allCategoriesResult] = await Promise.all([
    db.select({ id: merchants.id, normalizedName: merchants.normalizedName }).from(merchants),
    db.select({ name: categories.name }).from(categories),
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
