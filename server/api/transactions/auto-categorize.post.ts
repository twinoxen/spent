import { getDb } from '../../db'
import { transactions, merchants, categories, accounts } from '../../db/schema'
import { and, eq, inArray, isNull, or } from 'drizzle-orm'
import { autoCategorizeMerchant } from '../../utils/categorizer'
import { createCategorizerStrategy, type CategorizationInput } from '../../utils/llmCategorizer'

export default defineEventHandler(async (event) => {
  const db = await getDb()
  const userId = event.context.user.id
  const config = useRuntimeConfig()

  // Find the user's "Uncategorized" category
  const [uncategorizedCategory] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.name, 'Uncategorized'), eq(categories.userId, userId)))
    .limit(1)

  const uncategorizedId = uncategorizedCategory?.id ?? null

  const categoryWhereClause = uncategorizedId
    ? or(isNull(transactions.categoryId), eq(transactions.categoryId, uncategorizedId))
    : isNull(transactions.categoryId)

  // Scope to user's accounts
  const userAccountIds = db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.userId, userId))

  const uncategorized = await db
    .select({
      id: transactions.id,
      description: transactions.description,
      amount: transactions.amount,
      type: transactions.type,
      merchantId: transactions.merchantId,
    })
    .from(transactions)
    .where(and(inArray(transactions.accountId, userAccountIds), categoryWhereClause))

  if (uncategorized.length === 0) {
    return { categorized: 0, total: 0 }
  }

  // Fetch user's merchants for lookup
  const allMerchants = await db
    .select({ id: merchants.id, normalizedName: merchants.normalizedName })
    .from(merchants)
    .where(eq(merchants.userId, userId))

  const merchantMap = new Map(allMerchants.map(m => [m.id, m.normalizedName]))

  // Fetch user's categories for LLM categorization
  const allCategories = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(eq(categories.userId, userId))

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
      (name) => llmFallback(name, tx),
      userId
    )

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
