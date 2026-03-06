import { describe, it, expect } from 'vitest'
import { computeAccountBalance } from './computeBalances'

describe('computeAccountBalance', () => {
  it('calculates credit card debt from opening debt minus cashflow', () => {
    const result = computeAccountBalance({
      id: 1,
      name: 'Apple Card',
      type: 'credit_card',
      institution: 'Apple',
      lastFour: '1234',
      color: '#6366f1',
      currentBalance: 4411.83,
      balanceAsOfDate: '2026-03-05',
      creditLimit: 10000,
      apr: 24.99,
      createdAt: new Date('2026-03-01'),
      transactionCount: 3,
      // opening debt 6180.29, payment +2000, charges -231.54
      // debt = 6180.29 - (2000 - 231.54) = 4411.83
      totalTxAmount: 7948.75,
      postedTxAmount: 7948.75,
      pendingTxAmount: 0,
      openingTxAmount: 6180.29,
      openingTxDate: '2026-03-01',
    })

    expect(result.calculatedBalance).toBeCloseTo(4411.83, 2)
    expect(result.delta).toBeCloseTo(0, 2)
    expect(result.openingBalance).toBeCloseTo(6180.29, 2)
    expect(result.availableCredit).toBeCloseTo(5588.17, 2)
    expect(result.utilization).toBeCloseTo(0.441183, 6)
  })

  it('includes pending transactions in calculated balance for checking', () => {
    const result = computeAccountBalance({
      id: 2,
      name: 'Checking',
      type: 'checking',
      institution: 'Chase',
      lastFour: null,
      color: '#10b981',
      currentBalance: 970,
      balanceAsOfDate: '2026-03-05',
      creditLimit: null,
      apr: null,
      createdAt: new Date('2026-03-01'),
      transactionCount: 3,
      // Opening 1000 + posted expense -10 + pending expense -20 = 970
      totalTxAmount: 970,
      postedTxAmount: 990,
      pendingTxAmount: -20,
      openingTxAmount: 1000,
      openingTxDate: '2026-03-01',
    })

    expect(result.calculatedBalance).toBe(970)
    expect(result.delta).toBe(0)
    expect(result.openingBalance).toBe(1000)
    expect(result.availableCredit).toBeNull()
    expect(result.utilization).toBeNull()
  })

  it('uses opening-balance anchored aggregate and ignores pre-anchor transactions', () => {
    const result = computeAccountBalance({
      id: 3,
      name: 'Apple Card',
      type: 'credit_card',
      institution: 'Apple',
      lastFour: '9999',
      color: '#6366f1',
      currentBalance: 4411.83,
      balanceAsOfDate: '2026-03-06',
      creditLimit: 10000,
      apr: 24.99,
      createdAt: new Date('2026-03-01'),
      transactionCount: 7,
      // Includes old pre-anchor rows in totalTxAmount, but anchoredTxAmount must win.
      // anchoredTxAmount is opening + post-anchor cashflow aggregate.
      totalTxAmount: 7000,
      anchoredTxAmount: 7948.75,
      openingTxAmount: 6180.29,
      openingTxDate: '2026-03-01',
    })

    expect(result.calculatedBalance).toBeCloseTo(4411.83, 2)
    expect(result.delta).toBe(0)
  })

  it('uses deterministic same-day tie-break ordering around opening anchor', () => {
    const result = computeAccountBalance({
      id: 4,
      name: 'Tie Break Card',
      type: 'credit_card',
      institution: 'Test Bank',
      lastFour: '0000',
      color: '#6366f1',
      currentBalance: 80,
      balanceAsOfDate: '2026-03-06',
      creditLimit: 1000,
      apr: null,
      createdAt: new Date('2026-03-01'),
      transactionCount: 4,
      // anchoredTxAmount comes from SQL using (transactionDate, createdAt, id) > anchor tuple
      // so same-day transactions older than the anchor are excluded.
      anchoredTxAmount: 120,
      totalTxAmount: 90,
      openingTxAmount: 100,
      openingTxDate: '2026-03-01',
    })

    expect(result.calculatedBalance).toBe(80)
  })
})
