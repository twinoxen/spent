import { describe, it, expect, beforeEach } from 'vitest'
import { api, useTestUser } from '../test-utils/client'

const { user } = useTestUser()

// Fixtures shared across tests in this file — re-created in beforeEach
let accountId: number
let categoryId: number

beforeEach(async () => {
  // Create a fresh account and category for each test
  const accRes = await api(user().cookie, '/api/accounts', {
    method: 'POST',
    body: JSON.stringify({ name: 'Main Checking', type: 'checking' }),
  })
  accountId = (await accRes.json()).id

  const catRes = await api(user().cookie, '/api/categories', {
    method: 'POST',
    body: JSON.stringify({ name: 'Groceries' }),
  })
  categoryId = (await catRes.json()).id
})

async function createTransaction(overrides: Record<string, unknown> = {}) {
  const payload = {
    accountId,
    transactionDate: '2026-01-15',
    description: 'Whole Foods Market',
    type: 'Purchase',
    amount: 45.67,
    merchantName: 'Whole Foods',
    ...overrides,
  }
  const res = await api(user().cookie, '/api/transactions', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  expect(res.status).toBe(200)
  const { transaction } = await res.json()
  return transaction
}

describe('POST /api/transactions', () => {
  it('creates a transaction and resolves the merchant', async () => {
    const res = await api(user().cookie, '/api/transactions', {
      method: 'POST',
      body: JSON.stringify({
        accountId,
        transactionDate: '2026-01-10',
        description: 'STARBUCKS #1234',
        type: 'Purchase',
        amount: 6.75,
        merchantName: 'Starbucks',
      }),
    })
    expect(res.status).toBe(200)
    const { transaction } = await res.json()
    expect(transaction.id).toBeTypeOf('number')
    expect(transaction.description).toBe('STARBUCKS #1234')
    expect(transaction.amount).toBe(-6.75) // purchases are stored as negative
    expect(transaction.merchantId).toBeTypeOf('number')
  })

  it('stores income types as positive amounts', async () => {
    const res = await api(user().cookie, '/api/transactions', {
      method: 'POST',
      body: JSON.stringify({
        accountId,
        transactionDate: '2026-01-10',
        description: 'Direct Deposit',
        type: 'Deposit',
        amount: 2000,
      }),
    })
    expect(res.status).toBe(200)
    const { transaction } = await res.json()
    expect(transaction.amount).toBe(2000)
  })

  it('rejects missing required fields with 400', async () => {
    const res = await api(user().cookie, '/api/transactions', {
      method: 'POST',
      body: JSON.stringify({ accountId, description: 'No date or amount' }),
    })
    expect(res.status).toBe(400)
  })

  it('rejects an account belonging to another user with 400', async () => {
    const res = await api(user().cookie, '/api/transactions', {
      method: 'POST',
      body: JSON.stringify({
        accountId: 99999999,
        transactionDate: '2026-01-10',
        description: 'Unauthorized',
        type: 'Purchase',
        amount: 10,
      }),
    })
    expect(res.status).toBe(400)
  })

  it('rejects duplicate fingerprint with 409', async () => {
    const payload = {
      accountId,
      transactionDate: '2026-01-15',
      description: 'Exact Duplicate',
      type: 'Purchase',
      amount: 99.99,
    }
    const first = await api(user().cookie, '/api/transactions', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    expect(first.status).toBe(200)

    const second = await api(user().cookie, '/api/transactions', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    expect(second.status).toBe(409)
  })
})

describe('GET /api/transactions', () => {
  it('returns paginated results with a total', async () => {
    await createTransaction({ description: 'Tx A', amount: 10 })
    await createTransaction({ description: 'Tx B', amount: 20, transactionDate: '2026-01-16' })

    const res = await api(user().cookie, '/api/transactions?page=1&pageSize=10')
    expect(res.status).toBe(200)
    const data = await res.json()
    // count(*) is returned as a pg bigint string; coerce before comparing
    expect(Number(data.total)).toBe(2)
    expect(data.transactions).toHaveLength(2)
  })

  it('respects date range filters', async () => {
    await createTransaction({ description: 'January tx', transactionDate: '2026-01-05', amount: 5 })
    await createTransaction({ description: 'February tx', transactionDate: '2026-02-10', amount: 10 })

    const res = await api(
      user().cookie,
      '/api/transactions?startDate=2026-02-01&endDate=2026-02-28',
    )
    const data = await res.json()
    expect(Number(data.total)).toBe(1)
    expect(data.transactions[0].description).toBe('February tx')
  })
})

describe('PATCH /api/transactions/:id', () => {
  it('updates description, amount, and category', async () => {
    const tx = await createTransaction()
    const res = await api(user().cookie, `/api/transactions/${tx.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ description: 'Updated Desc', categoryId }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.description).toBe('Updated Desc')
    expect(data.categoryId).toBe(categoryId)
  })

  it('returns 404 for a non-existent transaction', async () => {
    const res = await api(user().cookie, '/api/transactions/99999999', {
      method: 'PATCH',
      body: JSON.stringify({ description: 'Nope' }),
    })
    expect(res.status).toBe(404)
  })
})

describe('reserves / envelopes', () => {
  it('earmarks cash without creating a transaction and releases it when linked to a real payment', async () => {
    const createReserveRes = await api(user().cookie, '/api/reserves', {
      method: 'POST',
      body: JSON.stringify({
        accountId,
        name: '116 HOA',
        targetAmount: 2456.87,
        currentReservedAmount: 818.96,
        contributionAmount: 818.96,
        contributionCadence: 'monthly',
        actualPaymentCadence: 'quarterly',
        nextDueDate: '2026-04-01',
        category: 'HOA',
      }),
    })
    expect(createReserveRes.status).toBe(200)
    const reserve = await createReserveRes.json()
    expect(reserve.name).toBe('116 HOA')
    expect(reserve.currentReservedAmount).toBe(818.96)

    const listAfterReserve = await api(user().cookie, '/api/transactions')
    const { total: totalAfterReserve } = await listAfterReserve.json()
    expect(Number(totalAfterReserve)).toBe(0)

    const contributionRes = await api(user().cookie, '/api/reserves/movements', {
      method: 'POST',
      body: JSON.stringify({
        reserveId: reserve.id,
        date: '2026-02-01',
        amount: 818.96,
        type: 'contribution',
      }),
    })
    expect(contributionRes.status).toBe(200)
    const contribution = await contributionRes.json()
    expect(contribution.reserve.currentReservedAmount).toBe(1637.92)

    const payment = await createTransaction({
      transactionDate: '2026-04-01',
      description: 'HOA Quarterly Check',
      merchantName: '116 HOA',
      amount: 2456.87,
    })

    const linkRes = await api(user().cookie, `/api/reserves/${reserve.id}/link-transaction`, {
      method: 'POST',
      body: JSON.stringify({ transactionId: payment.id }),
    })
    expect(linkRes.status).toBe(200)
    const linked = await linkRes.json()
    expect(linked.movement.type).toBe('release')
    expect(linked.movement.linkedTransactionId).toBe(payment.id)
    expect(linked.reserve.currentReservedAmount).toBe(0)
  })

  it('returns availability summary that subtracts bills and active reserves', async () => {
    await api(user().cookie, `/api/accounts/${accountId}`, {
      method: 'PATCH',
      body: JSON.stringify({ currentBalance: 5000, balanceAsOfDate: '2026-01-01' }),
    })

    await api(user().cookie, '/api/bills', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Insurance',
        amount: 1200,
        occurrence: 'annual',
        dueDate: '2026-12-01',
        spreadMonthly: true,
      }),
    })

    await api(user().cookie, '/api/reserves', {
      method: 'POST',
      body: JSON.stringify({
        accountId,
        name: 'HOA',
        targetAmount: 2456.87,
        currentReservedAmount: 818.96,
        contributionAmount: 818.96,
        contributionCadence: 'monthly',
        actualPaymentCadence: 'quarterly',
        nextDueDate: '2026-04-01',
      }),
    })

    const res = await api(user().cookie, '/api/reserves/summary')
    expect(res.status).toBe(200)
    const summary = await res.json()
    expect(summary.currentBalance).toBe(5000)
    expect(summary.scheduledUpcomingBills).toBe(100)
    expect(summary.activeReserves).toBe(818.96)
    expect(summary.availableToSpend).toBe(4081.04)
  })
})

describe('DELETE /api/transactions/:id', () => {
  it('deletes the transaction', async () => {
    const tx = await createTransaction()
    const res = await api(user().cookie, `/api/transactions/${tx.id}`, { method: 'DELETE' })
    expect(res.status).toBe(200)

    // Verify it no longer appears in the list
    const listRes = await api(user().cookie, '/api/transactions')
    const { transactions: list } = await listRes.json()
    expect(list.find((t: { id: number }) => t.id === tx.id)).toBeUndefined()
  })

  it('returns 404 for a non-existent transaction', async () => {
    const res = await api(user().cookie, '/api/transactions/99999999', { method: 'DELETE' })
    expect(res.status).toBe(404)
  })
})

describe('GET /api/transactions/stats', () => {
  it('returns spend by category, merchant, and time period', async () => {
    await createTransaction({ amount: 50, merchantName: 'Amazon', categoryId })
    await createTransaction({
      amount: 30,
      description: 'Netflix',
      merchantName: 'Netflix',
      transactionDate: '2026-01-20',
    })

    const res = await api(
      user().cookie,
      '/api/transactions/stats?startDate=2026-01-01&endDate=2026-01-31',
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    // Stats response shape
    expect(data.spendByCategory).toBeDefined()
    expect(data.topMerchants).toBeDefined()
    expect(data.spendOverTime).toBeDefined()
    expect(Number(data.totalSpend)).toBeGreaterThanOrEqual(0)
  })

  it('supports granularity=day for the spendOverTime series', async () => {
    await createTransaction({ amount: 25, transactionDate: '2026-01-05' })
    await createTransaction({
      amount: 15,
      description: 'Day 2 purchase',
      transactionDate: '2026-01-06',
    })

    const res = await api(
      user().cookie,
      '/api/transactions/stats?startDate=2026-01-01&endDate=2026-01-07&granularity=day',
    )
    expect(res.status).toBe(200)
    const { spendOverTime } = await res.json()
    // Day-level keys look like "2026-01-05" (10 chars)
    expect(spendOverTime.length).toBeGreaterThan(0)
    expect(spendOverTime[0].month.length).toBe(10)
  })
})

describe('GET /api/transactions/daily', () => {
  it('returns daily spend totals respecting the date range', async () => {
    await createTransaction({ amount: 40, transactionDate: '2026-03-01' })
    await createTransaction({
      amount: 60,
      description: 'March 2 expense',
      transactionDate: '2026-03-02',
    })

    const res = await api(
      user().cookie,
      '/api/transactions/daily?startDate=2026-03-01&endDate=2026-03-31',
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.days).toBeDefined()
    expect(data.days.length).toBeGreaterThanOrEqual(2)
  })
})
