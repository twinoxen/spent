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
      currentBalance: 700,
      balanceAsOfDate: '2026-03-05',
      creditLimit: 5000,
      apr: 24.99,
      createdAt: new Date('2026-03-01'),
      transactionCount: 3,
      // Opening owed 1000 stored as -1000, charge -150, payment +200 => sum -950 => debt 950
      totalTxAmount: -950,
      openingTxAmount: -1000,
      openingTxDate: '2026-03-01',
    })

    expect(result.calculatedBalance).toBe(950)
    expect(result.delta).toBe(250)
    expect(result.openingBalance).toBe(1000)
    expect(result.availableCredit).toBe(4050)
    expect(result.utilization).toBe(0.19)
  })

  it('calculates checking balance from signed transaction sum and snapshot delta', () => {
    const result = computeAccountBalance({
      id: 2,
      name: 'Checking',
      type: 'checking',
      institution: 'Chase',
      lastFour: null,
      color: '#10b981',
      currentBalance: 1300,
      balanceAsOfDate: '2026-03-05',
      creditLimit: null,
      apr: null,
      createdAt: new Date('2026-03-01'),
      transactionCount: 3,
      // Opening 1000 + paycheck 500 + groceries -200
      totalTxAmount: 1300,
      openingTxAmount: 1000,
      openingTxDate: '2026-03-01',
    })

    expect(result.calculatedBalance).toBe(1300)
    expect(result.delta).toBe(0)
    expect(result.openingBalance).toBe(1000)
    expect(result.availableCredit).toBeNull()
    expect(result.utilization).toBeNull()
  })
})
