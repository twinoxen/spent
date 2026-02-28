import { OpenAICategorizerStrategy } from './llm-strategies/openai'

export interface CategorizationInput {
  merchantName: string
  description: string
  amount: number
  type: string
  sourceCategory?: string
  categories: { id: number; name: string }[]
}

export interface MerchantSummary {
  normalizedName: string
  transactionCount: number
  totalAmount: number
  sampleDescriptions: string[]
}

export interface CategorySuggestion {
  name: string
  icon: string
  color: string
  patterns: string[]
  rationale: string
}

export interface CategorizerStrategy {
  categorize(input: CategorizationInput): Promise<number | null>
  suggestNewCategories?(merchants: MerchantSummary[], existingCategories: string[]): Promise<CategorySuggestion[]>
}

export function createCategorizerStrategy(config: {
  openaiApiKey?: string
}): CategorizerStrategy | null {
  if (config.openaiApiKey) {
    return new OpenAICategorizerStrategy(config.openaiApiKey)
  }
  return null
}
