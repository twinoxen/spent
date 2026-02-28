import { getDb } from '../../db'
import { transactions, merchants, categories } from '../../db/schema'
import { eq, isNull, or } from 'drizzle-orm'
import { autoCategorizeMerchant } from '../../utils/categorizer'
import { createCategorizerStrategy, type CategorizationInput } from '../../utils/llmCategorizer'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const config = useRuntimeConfig()

  // Find the "Uncategorized" category id
  const [uncategorizedCategory] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.name, 'Uncategorized'))
    .limit(1)

  const uncategorizedId = uncategorizedCategory?.id ?? null

  // Fetch all transactions that are uncategorized (null or the Uncategorized catch-all)
  const whereClause = uncategorizedId
    ? or(isNull(transactions.categoryId), eq(transactions.categoryId, uncategorizedId))
    : isNull(transactions.categoryId)

  const uncategorized = await db
    .select({
      id: transactions.id,
      description: transactions.description,
      amount: transactions.amount,
      type: transactions.type,
      merchantId: transactions.merchantId,
    })
    .from(transactions)
    .where(whereClause)

  if (uncategorized.length === 0) {
    return { categorized: 0, total: 0 }
  }

  // Fetch all merchants for lookup
  const allMerchants = await db
    .select({ id: merchants.id, normalizedName: merchants.normalizedName })
    .from(merchants)

  const merchantMap = new Map(allMerchants.map(m => [m.id, m.normalizedName]))

  // Fetch all categories once for LLM categorization
  const allCategories = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)

  const llmStrategy = createCategorizerStrategy({ openaiApiKey: config.openaiApiKey })
  const llmCache = new Map<string, number | null>()

  const llmFallback = async (merchantName: string, tx: typeof uncategorized[number]): Promise<number | null> => {
    if (!llmStrategy) return null
    if (llmCache.has(merchantName)) return llmCache.get(merchantName) ?? null

    const input: CategorizationInput = {
      merchantName,
      description: tx.description,
      amount: tx.amount,
      type: tx.type,
      categories: allCategories,
    }

    const result = await llmStrategy.categorize(input)
    llmCache.set(merchantName, result)
    return result
  }

  let categorized = 0

  for (const tx of uncategorized) {
    const merchantName = tx.merchantId ? (merchantMap.get(tx.merchantId) ?? tx.description) : tx.description

    const categoryId = await autoCategorizeMerchant(
      merchantName,
      tx.description,
      undefined,
      (name) => llmFallback(name, tx)
    )

    // Only update if we got a real category (not null and not the uncategorized catch-all)
    if (categoryId !== null && categoryId !== uncategorizedId) {
      await db
        .update(transactions)
        .set({ categoryId })
        .where(eq(transactions.id, tx.id))

      categorized++
    }
  }

  return { categorized, total: uncategorized.length }
})
