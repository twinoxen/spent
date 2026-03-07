import { describe, it, expect } from 'vitest'
import { buildRawAccountRows } from './listAccountsBalances'
import { computeAccountBalance } from './computeBalances'

describe('buildRawAccountRows + computeAccountBalance', () => {
  it('returns accounts even when no opening balance transaction exists', () => {
    const accounts = [{
      id: 1,
      name: 'Checking',
      type: 'checking',
      institution: 'Test Bank',
      lastFour: null,
      color: '#10b981',
      currentBalance: null,
      balanceAsOfDate: null,
      creditLimit: null,
      apr: null,
      createdAt: new Date('2026-01-01'),
    }]

    const txs = [{
      id: 10,
      accountId: 1,
      amount: -50,
      isPending: false,
      isOpeningBalance: false,
      transactionDate: '2026-03-01',
    }]

    const [raw] = buildRawAccountRows(accounts, txs)
    const result = computeAccountBalance(raw)

    expect(result.id).toBe(1)
    expect(result.openingBalance).toBeNull()
    expect(result.calculatedBalance).toBe(-50)
    expect(result.transactionCount).toBe(1)
  })

  it('computes credit card and checking balances from anchored cutoff semantics', () => {
    const accounts = [
      {
        id: 1,
        name: 'Card',
        type: 'credit_card',
        institution: null,
        lastFour: '1234',
        color: '#6366f1',
        currentBalance: null,
        balanceAsOfDate: null,
        creditLimit: 1000,
        apr: null,
        createdAt: new Date('2026-01-01'),
      },
      {
        id: 2,
        name: 'Checking',
        type: 'checking',
        institution: null,
        lastFour: null,
        color: '#10b981',
        currentBalance: null,
        balanceAsOfDate: null,
        creditLimit: null,
        apr: null,
        createdAt: new Date('2026-01-01'),
      },
    ]

    const txs = [
      // Credit card: opening debt 500, pre-anchor noise excluded, then +200 payment and -50 charge
      { id: 1, accountId: 1, amount: -999, isPending: false, isOpeningBalance: false, transactionDate: '2026-02-01' },
      { id: 2, accountId: 1, amount: 500, isPending: false, isOpeningBalance: true, transactionDate: '2026-03-01' },
      { id: 3, accountId: 1, amount: 200, isPending: false, isOpeningBalance: false, transactionDate: '2026-03-02' },
      { id: 4, accountId: 1, amount: -50, isPending: true, isOpeningBalance: false, transactionDate: '2026-03-03' },

      // Checking: opening 1000, then -10 posted and -20 pending
      { id: 5, accountId: 2, amount: 1000, isPending: false, isOpeningBalance: true, transactionDate: '2026-03-01' },
      { id: 6, accountId: 2, amount: -10, isPending: false, isOpeningBalance: false, transactionDate: '2026-03-02' },
      { id: 7, accountId: 2, amount: -20, isPending: true, isOpeningBalance: false, transactionDate: '2026-03-03' },
    ]

    const raws = buildRawAccountRows(accounts, txs)
    const card = computeAccountBalance(raws.find(r => r.id === 1)!)
    const checking = computeAccountBalance(raws.find(r => r.id === 2)!)

    // Card debt = opening - cashflow_after_opening = 500 - (200 - 50) = 350
    expect(card.calculatedBalance).toBe(350)
    expect(card.openingBalance).toBe(500)

    // Checking = opening + posted + pending = 1000 - 10 - 20 = 970
    expect(checking.calculatedBalance).toBe(970)
    expect(checking.openingBalance).toBe(1000)
  })
})
