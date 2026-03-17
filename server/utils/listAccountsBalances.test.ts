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

  it('uses the snapshot as the balance anchor when currentBalance + balanceAsOfDate are set', () => {
    const accounts = [
      {
        id: 1,
        name: 'Apple Card',
        type: 'credit_card',
        institution: null,
        lastFour: null,
        color: '#6366f1',
        // Snapshot says $842.44 as-of 2026-03-16; opening balance was wrong ($6180.29).
        // The calculated balance should be anchored at the snapshot, not the opening balance.
        currentBalance: 842.44,
        balanceAsOfDate: '2026-03-16',
        creditLimit: 21500,
        apr: null,
        createdAt: new Date('2026-01-01'),
      },
      {
        id: 2,
        name: 'BOA Main',
        type: 'checking',
        institution: null,
        lastFour: null,
        color: '#10b981',
        currentBalance: 5555.17,
        balanceAsOfDate: '2026-03-06',
        creditLimit: null,
        apr: null,
        createdAt: new Date('2026-01-01'),
      },
    ]

    const txs = [
      // Credit card: stale opening balance (wrong/inflated) then recent transactions
      { id: 100, accountId: 1, amount: 6180.29, isPending: false, isOpeningBalance: true, transactionDate: '2026-03-04' },
      { id: 101, accountId: 1, amount: -62.53,  isPending: true,  isOpeningBalance: false, transactionDate: '2026-03-16' },
      { id: 102, accountId: 1, amount: -11.97,  isPending: true,  isOpeningBalance: false, transactionDate: '2026-03-16' },

      // Checking: opening + posted expense after snapshot
      { id: 200, accountId: 2, amount: 5555.17, isPending: false, isOpeningBalance: true,  transactionDate: '2026-03-06' },
      { id: 201, accountId: 2, amount: -100,    isPending: false, isOpeningBalance: false, transactionDate: '2026-03-07' },
      { id: 202, accountId: 2, amount: -50,     isPending: true,  isOpeningBalance: false, transactionDate: '2026-03-08' },
    ]

    const raws = buildRawAccountRows(accounts, txs)
    const card = computeAccountBalance(raws.find(r => r.id === 1)!)
    const checking = computeAccountBalance(raws.find(r => r.id === 2)!)

    // Credit card: snapshot=$842.44, pending charges on snapshot date=-74.50
    // cashflow_since_snapshot = -62.53 + -11.97 = -74.50
    // calculatedBalance = 842.44 - (-74.50) = 916.94  (more debt due to pending charges)
    expect(card.calculatedBalance).toBeCloseTo(916.94, 2)
    // delta = calculatedBalance - snapshot = +74.50 (positive = more owed than snapshot)
    expect(card.delta).toBeCloseTo(74.5, 2)
    // Phantom $11,558.71 must NOT appear
    expect(card.calculatedBalance).toBeLessThan(1500)

    // Checking: snapshot=$5555.17, cashflow_since_snapshot = -100 + -50 = -150
    // calculatedBalance = 5555.17 + (-150) = 5405.17
    expect(checking.calculatedBalance).toBeCloseTo(5405.17, 2)
    // delta = -150
    expect(checking.delta).toBeCloseTo(-150, 2)
  })

  it('treats pending transactions on the snapshot date as post-snapshot activity', () => {
    const accounts = [{
      id: 1,
      name: 'Card',
      type: 'credit_card',
      institution: null,
      lastFour: null,
      color: null,
      currentBalance: 100,
      balanceAsOfDate: '2026-03-10',
      creditLimit: 5000,
      apr: null,
      createdAt: null,
    }]

    const txs = [
      // Posted on snapshot date — included in snapshot value, should NOT count again
      { id: 1, accountId: 1, amount: -30, isPending: false, isOpeningBalance: false, transactionDate: '2026-03-10' },
      // Pending on snapshot date — NOT in snapshot, should count
      { id: 2, accountId: 1, amount: -20, isPending: true,  isOpeningBalance: false, transactionDate: '2026-03-10' },
      // Posted after snapshot — should count
      { id: 3, accountId: 1, amount: -10, isPending: false, isOpeningBalance: false, transactionDate: '2026-03-11' },
    ]

    const [raw] = buildRawAccountRows(accounts, txs)
    const result = computeAccountBalance(raw)

    // snapshotFlow = pending-on-date(-20) + posted-after(-10) = -30
    // calculatedBalance = 100 - (-30) = 130  (more owed)
    expect(result.calculatedBalance).toBeCloseTo(130, 2)
    expect(result.delta).toBeCloseTo(30, 2)
  })
})
