import { describe, it, expect, beforeEach } from 'vitest'
import { api, useTestUser } from '../test-utils/client'

const { user } = useTestUser()

let accountId: number

beforeEach(async () => {
  const res = await api(user().cookie, '/api/accounts', {
    method: 'POST',
    body: JSON.stringify({ name: 'Test Account', type: 'checking' }),
  })
  accountId = (await res.json()).id
})

let _txSeq = 0

/** Helper: create a transaction that auto-creates a merchant with the given name. */
async function seedMerchant(normalizedName: string, description = normalizedName) {
  const day = String((_txSeq++ % 28) + 1).padStart(2, '0')
  const res = await api(user().cookie, '/api/transactions', {
    method: 'POST',
    body: JSON.stringify({
      accountId,
      transactionDate: `2026-01-${day}`,
      description,
      type: 'Purchase',
      amount: 10 + _txSeq,
      merchantName: normalizedName,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`seedMerchant failed (${res.status}): ${text}`)
  }
}

describe('GET /api/merchants', () => {
  it('returns an empty array when no merchants exist', async () => {
    const res = await api(user().cookie, '/api/merchants')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it('returns merchants created via transactions', async () => {
    await seedMerchant('Amazon')
    const res = await api(user().cookie, '/api/merchants')
    const data = await res.json()
    expect(data).toHaveLength(1)
    expect(data[0].normalizedName).toBe('Amazon')
  })

  it('supports ?search to filter by name', async () => {
    await seedMerchant('Amazon')
    await seedMerchant('Netflix', 'Netflix subscription')

    const res = await api(user().cookie, '/api/merchants?search=amaz')
    const data = await res.json()
    expect(data).toHaveLength(1)
    expect(data[0].normalizedName).toBe('Amazon')
  })
})

describe('POST /api/merchants/merge', () => {
  it('merges source merchant into a new named merchant', async () => {
    await seedMerchant('Old Coffee Shop')

    const listRes = await api(user().cookie, '/api/merchants')
    const merchants = await listRes.json()
    const source = merchants.find((m: { normalizedName: string }) => m.normalizedName === 'Old Coffee Shop')
    expect(source).toBeDefined()

    const res = await api(user().cookie, '/api/merchants/merge', {
      method: 'POST',
      body: JSON.stringify({
        sourceMerchantId: source.id,
        newMerchantName: 'Coffee Shop',
      }),
    })
    expect(res.status).toBe(200)
    const updated = await res.json()
    expect(updated.normalizedName).toBe('Coffee Shop')
    // Source merchant should no longer exist
    const afterList = await api(user().cookie, '/api/merchants')
    const after = await afterList.json()
    expect(after.find((m: { id: number }) => m.id === source.id)).toBeUndefined()
  })

  it('merges source into an existing target merchant', async () => {
    await seedMerchant('Merchant A', 'Merchant A purchase')
    await seedMerchant('Merchant B', 'Merchant B purchase')

    const listRes = await api(user().cookie, '/api/merchants')
    const merchants = await listRes.json()
    const a = merchants.find((m: { normalizedName: string }) => m.normalizedName === 'Merchant A')
    const b = merchants.find((m: { normalizedName: string }) => m.normalizedName === 'Merchant B')

    const res = await api(user().cookie, '/api/merchants/merge', {
      method: 'POST',
      body: JSON.stringify({ sourceMerchantId: a.id, targetMerchantId: b.id }),
    })
    expect(res.status).toBe(200)

    // After merge, only the target should remain
    const afterList = await api(user().cookie, '/api/merchants')
    const after = await afterList.json()
    expect(after.find((m: { id: number }) => m.id === a.id)).toBeUndefined()
    expect(after.find((m: { id: number }) => m.id === b.id)).toBeDefined()
  })

  it('rejects missing sourceMerchantId with 400', async () => {
    const res = await api(user().cookie, '/api/merchants/merge', {
      method: 'POST',
      body: JSON.stringify({ newMerchantName: 'Whatever' }),
    })
    expect(res.status).toBe(400)
  })

  it('rejects when neither targetMerchantId nor newMerchantName is provided', async () => {
    await seedMerchant('Lonely Merchant')
    const listRes = await api(user().cookie, '/api/merchants')
    const [merchant] = await listRes.json()

    const res = await api(user().cookie, '/api/merchants/merge', {
      method: 'POST',
      body: JSON.stringify({ sourceMerchantId: merchant.id }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 404 for a non-existent source merchant', async () => {
    const res = await api(user().cookie, '/api/merchants/merge', {
      method: 'POST',
      body: JSON.stringify({ sourceMerchantId: 99999999, newMerchantName: 'Foo' }),
    })
    expect(res.status).toBe(404)
  })
})
