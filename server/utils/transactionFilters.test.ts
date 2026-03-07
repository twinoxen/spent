import { describe, expect, it } from 'vitest'
import { parseTransactionFilters } from './transactionFilters'

describe('parseTransactionFilters', () => {
  it('parses pendingOnly=true from query params', () => {
    const parsed = parseTransactionFilters({ pendingOnly: 'true' })
    expect(parsed.pendingOnly).toBe(true)
  })

  it('defaults pendingOnly to false when param is absent', () => {
    const parsed = parseTransactionFilters({})
    expect(parsed.pendingOnly).toBe(false)
  })
})
