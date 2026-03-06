import { describe, expect, it } from 'vitest'
import { formatMoney } from './formatMoney'

describe('formatMoney', () => {
  it('formats positive values as standard currency', () => {
    expect(formatMoney(1234.56)).toBe('$1,234.56')
  })

  it('formats zero as standard currency', () => {
    expect(formatMoney(0)).toBe('$0.00')
  })

  it('formats negative values in accounting style parentheses', () => {
    expect(formatMoney(-1234.56)).toBe('($1,234.56)')
  })

  it('supports locale and currency overrides', () => {
    expect(formatMoney(-1234.56, { locale: 'en-GB', currency: 'GBP' })).toBe('(£1,234.56)')
  })
})
