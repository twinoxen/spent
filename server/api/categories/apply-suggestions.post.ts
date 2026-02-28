import { getDb } from '../../db'
import { transactions, merchants, categories, merchantRules } from '../../db/schema'
import { eq, isNull, or } from 'drizzle-orm'
import { autoCategorizeMerchant } from '../../utils/categorizer'
import { createCategorizerStrategy, type CategorySuggestion, type CategorizationInput } from '../../utils/llmCategorizer'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ approved: CategorySuggestion[] }>(event)

  if (!Array.isArray(body?.approved) || body.approved.length === 0) {
    throw createError({ statusCode: 400, message: 'No approved suggestions provided.' })
  }

  const db = getDb()
  const config = useRuntimeConfig()

  // 1. Create each approved category and its merchant rules
  let createdCategories = 0

  for (const suggestion of body.approved) {
    const [newCategory] = await db
      .insert(categories)
      .values({
        name: suggestion.name,
        icon: suggestion.icon || null,
        color: suggestion.color || null,
      })
      .returning({ id: categories.id })

    createdCategories++

    if (suggestion.patterns?.length) {
      await db.insert(merchantRules).values(
        suggestion.patterns.map((pattern, i) => ({
          pattern: pattern.toLowerCase(),
          categoryId: newCategory.id,
          priority: suggestion.patterns.length - i,
        }))
      )
    }
  }

  // 2. Re-run auto-categorize on all uncategorized transactions
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
      id: transactions.id,
      description: transactions.description,
      amount: transactions.amount,
      type: transactions.type,
      merchantId: transactions.merchantId,
    })
    .from(transactions)
    .where(whereClause)

  const allMerchants = await db
    .select({ id: merchants.id, normalizedName: merchants.normalizedName })
    .from(merchants)

  const merchantMap = new Map(allMerchants.map(m => [m.id, m.normalizedName]))

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

    if (categoryId !== null && categoryId !== uncategorizedId) {
      await db
        .update(transactions)
        .set({ categoryId })
        .where(eq(transactions.id, tx.id))

      categorized++
    }
  }

  return { created: createdCategories, categorized }
})
