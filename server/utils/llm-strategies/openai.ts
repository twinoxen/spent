import OpenAI from 'openai'
import type { CategorizerStrategy, CategorizationInput, CategorySuggestion, MerchantSummary } from '../llmCategorizer'

export class OpenAICategorizerStrategy implements CategorizerStrategy {
  private client: OpenAI

  constructor(apiKey: string, private model = 'gpt-4o-mini') {
    this.client = new OpenAI({ apiKey })
  }

  async categorize(input: CategorizationInput): Promise<number | null> {
    const { merchantName, description, amount, type, sourceCategory, categories } = input

    if (categories.length === 0) return null

    const categoryList = categories.map(c => c.name).join('\n')

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are a financial transaction categorizer. Given a transaction, return the single most appropriate category from the provided list.

Available categories:
${categoryList}

Respond with JSON in this exact format: { "category": "<category name from the list above>" }
Only use a category name exactly as it appears in the list.`,
          },
          {
            role: 'user',
            content: `Categorize this transaction:
Merchant: ${merchantName}
Description: ${description}
Amount: $${amount.toFixed(2)}
Type: ${type}${sourceCategory ? `\nSource category hint: ${sourceCategory}` : ''}`,
          },
        ],
      })

      const content = response.choices[0]?.message?.content
      if (!content) return null

      const parsed = JSON.parse(content) as { category?: string }
      const categoryName = parsed.category?.trim().toLowerCase()
      if (!categoryName) return null

      const match = categories.find(c => c.name.toLowerCase() === categoryName)
      return match?.id ?? null
    } catch {
      return null
    }
  }

  async suggestNewCategories(merchants: MerchantSummary[], existingCategories: string[]): Promise<CategorySuggestion[]> {
    if (merchants.length === 0) return []

    const merchantList = merchants
      .map(m => `- ${m.normalizedName} (${m.transactionCount} txn, $${m.totalAmount.toFixed(2)}${m.sampleDescriptions.length ? `, e.g. "${m.sampleDescriptions[0]}"` : ''})`)
      .join('\n')

    const existingList = existingCategories.length
      ? `\nExisting categories (do NOT suggest these or close variants):\n${existingCategories.map(c => `- ${c}`).join('\n')}`
      : ''

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are a financial transaction categorizer helping a user organize their spending.

You will receive a list of uncategorized merchants. Your job is to suggest new spending categories that would logically group them.

Rules:
- Group related merchants into a single category (e.g. Netflix + Hulu + Spotify → "Streaming Services")
- Each category should cover at least one merchant from the list
- Suggest 1–6 categories total; avoid over-fragmenting
- For "patterns", provide short lowercase substrings that uniquely identify each merchant (used for rule matching)
- Choose a relevant single emoji for "icon" and a hex color for "color"
- IMPORTANT: Do NOT suggest any category that already exists or is semantically equivalent to an existing one${existingList}

Respond with JSON in this exact format:
{
  "suggestions": [
    {
      "name": "Category Name",
      "icon": "📺",
      "color": "#6366f1",
      "patterns": ["netflix", "hulu"],
      "rationale": "One sentence explaining this grouping"
    }
  ]
}`,
          },
          {
            role: 'user',
            content: `Suggest new categories for these uncategorized merchants:\n${merchantList}`,
          },
        ],
      })

      const content = response.choices[0]?.message?.content
      if (!content) return []

      const parsed = JSON.parse(content) as { suggestions?: CategorySuggestion[] }
      return Array.isArray(parsed.suggestions) ? parsed.suggestions : []
    } catch {
      return []
    }
  }
}
