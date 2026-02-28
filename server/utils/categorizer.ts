import { getDb } from '../db'
import { merchantRules, categories } from '../db/schema'
import { desc, eq, and } from 'drizzle-orm'

export async function autoCategorizeMerchant(
  merchantName: string,
  description: string,
  sourceCategory: string | undefined,
  llmFallback: ((merchantName: string) => Promise<number | null>) | undefined,
  userId: number
): Promise<number | null> {
  const db = await getDb()

  // Normalize for matching
  const searchText = `${merchantName} ${description}`.toLowerCase()

  // Get merchant rules for this user ordered by priority
  const rules = await db
    .select({
      id: merchantRules.id,
      pattern: merchantRules.pattern,
      categoryId: merchantRules.categoryId,
      priority: merchantRules.priority,
    })
    .from(merchantRules)
    .where(eq(merchantRules.userId, userId))
    .orderBy(desc(merchantRules.priority))

  // Find first matching rule
  for (const rule of rules) {
    const pattern = rule.pattern.toLowerCase()

    // Check if pattern is a regex (contains special regex chars)
    if (pattern.includes('\\') || pattern.includes('|')) {
      try {
        const regex = new RegExp(pattern, 'i')
        if (regex.test(searchText)) {
          return rule.categoryId
        }
      } catch {
        // If regex is invalid, fall back to substring match
        if (searchText.includes(pattern)) {
          return rule.categoryId
        }
      }
    } else {
      // Simple substring match
      if (searchText.includes(pattern)) {
        return rule.categoryId
      }
    }
  }

  // Fallback: map source-provided category hint to a known category name.
  // This mapping covers Apple Card category values; extend as new sources are added.
  if (sourceCategory) {
    const categoryMapping: Record<string, string> = {
      'Restaurants': 'Restaurants',
      'Grocery': 'Supermarket',
      'Gas': 'Gas',
      'Transportation': 'Transportation',
      'Entertainment': 'Entertainment',
      'Shopping': 'General Retail',
      'Other': 'Other',
    }

    const mappedCategoryName = categoryMapping[sourceCategory]
    if (mappedCategoryName) {
      const [category] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.name, mappedCategoryName), eq(categories.userId, userId)))
        .limit(1)

      if (category) {
        return category.id
      }
    }
  }

  // LLM fallback
  if (llmFallback) {
    const llmResult = await llmFallback(merchantName)
    if (llmResult !== null) return llmResult
  }

  // Final fallback: Uncategorized
  const [uncategorized] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.name, 'Uncategorized'), eq(categories.userId, userId)))
    .limit(1)

  return uncategorized?.id || null
}
