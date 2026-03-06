import { describe, it, expect } from 'vitest'
import { computeAccountBalance } from './computeBalances'

describe('computeAccountBalance', () => {
  it('calculates credit card debt from opening balance + charges + payments', () => {
    const result = computeAccountBalance({
      id: 1,
      name: 'Apple Card',
      type: 'credit_card',
      institution: 'Apple',
      lastFour: '1234',
      color: '#6366f1',
      currentBalance: 8000,
      balanceAsOfDate: '2026-03-05',
      creditLimit: 10000,
      apr: 24.99,
      createdAt: new Date('2026-03-01'),
      transactionCount: 3,
      // Opening owed 6180.29 + payment 2000 - charges 9.07 = 8171.22 debt owed
      totalTxAmount: 8171.22,
      postedTxAmount: 8171.22,
      pendingTxAmount: 0,
      openingTxAmount: 6180.29,
      openingTxDate: '2026-03-01',
    })

    expect(result.calculatedBalance).toBeCloseTo(8171.22, 2)
    expect(result.delta).toBeCloseTo(171.22, 2)
    expect(result.openingBalance).toBeCloseTo(6180.29, 2)
    expect(result.availableCredit).toBeCloseTo(1828.78, 2)
    expect(result.utilization).toBeCloseTo(0.817122, 6)
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
})
