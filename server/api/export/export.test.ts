import { describe, it, expect, beforeEach } from 'vitest'
import { api, useTestUser } from '../test-utils/client'

const { user } = useTestUser()

let accountId: number

beforeEach(async () => {
  const res = await api(user().cookie, '/api/accounts', {
    method: 'POST',
    body: JSON.stringify({ name: 'Export Account', type: 'checking' }),
  })
  accountId = (await res.json()).id
})

let _seq = 0

async function seedTransaction(overrides: Record<string, unknown> = {}) {
  const seq = ++_seq
  const res = await api(user().cookie, '/api/transactions', {
    method: 'POST',
    body: JSON.stringify({
      accountId,
      transactionDate: '2026-02-14',
      description: `Test Purchase ${seq}`,
      type: 'Purchase',
      amount: 42.0 + seq,
      ...overrides,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`seedTransaction failed (${res.status}): ${text}`)
  }
}

describe('GET /api/export/transactions', () => {
  it('returns a CSV with correct headers', async () => {
    await seedTransaction()

    const res = await api(user().cookie, '/api/export/transactions')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toMatch(/text\/csv/)
    expect(res.headers.get('content-disposition')).toMatch(/attachment.*\.csv/)

    const csv = await res.text()
    const [headerLine] = csv.split('\n')
    expect(headerLine).toContain('Date')
    expect(headerLine).toContain('Description')
    expect(headerLine).toContain('Amount')
    expect(headerLine).toContain('Account')
  })

  it('includes transaction data in the CSV body', async () => {
    await seedTransaction({ description: 'Grocery Run', amount: 75.5 })

    const csv = await (await api(user().cookie, '/api/export/transactions')).text()
    expect(csv).toContain('Grocery Run')
    // Amount is stored negative for purchases; CSV should reflect that
    expect(csv).toContain('-75.5')
  })

  it('returns an empty CSV (headers only) when no transactions exist', async () => {
    const csv = await (await api(user().cookie, '/api/export/transactions')).text()
    const lines = csv.split('\n').filter(Boolean)
    expect(lines).toHaveLength(1) // only the header row
  })

  it('respects startDate / endDate query filters', async () => {
    await seedTransaction({ description: 'January tx', transactionDate: '2026-01-10', amount: 10 })
    await seedTransaction({ description: 'March tx', transactionDate: '2026-03-10', amount: 20 })

    const csv = await (
      await api(user().cookie, '/api/export/transactions?startDate=2026-03-01&endDate=2026-03-31')
    ).text()

    expect(csv).toContain('March tx')
    expect(csv).not.toContain('January tx')
  })
})
