import { appleCardStrategy } from './apple-card'
import { chaseStrategy } from './chase'
import { bankOfAmericaStrategy } from './bank-of-america'
import { mintStrategy } from './mint'
import type { ImportStrategy } from './types'

const strategies: ImportStrategy[] = [
  appleCardStrategy,
  chaseStrategy,
  bankOfAmericaStrategy,
  mintStrategy,
]

/**
 * Returns the first strategy whose `canHandle` matches, or null if none do.
 * Callers should fall back to LLM-based parsing when null is returned.
 */
export function detectStrategy(filename: string, content: string): ImportStrategy | null {
  return strategies.find(s => s.canHandle(filename, content)) ?? null
}
