import { appleCardStrategy } from './apple-card'
import type { ImportStrategy } from './types'

const strategies: ImportStrategy[] = [
  appleCardStrategy,
]

export function detectStrategy(filename: string, content: string): ImportStrategy {
  const match = strategies.find(s => s.canHandle(filename, content))
  if (!match) {
    throw new Error(`No import strategy found for file: ${filename}`)
  }
  return match
}
