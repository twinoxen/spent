import { describe, it, expect } from 'vitest'
import { api, useTestUser } from '../test-utils/client'

const { user } = useTestUser()

async function createAccount(cookie: string, overrides: Record<string, unknown> = {}) {
  const res = await api(cookie, '/api/accounts', {
    method: 'POST',
    body: JSON.stringify({ name: 'Test Checking', type: 'checking', ...overrides }),
  })
  expect(res.status).toBe(200)
  return res.json()
}

describe('GET /api/accounts', () => {
  it('returns an empty array when no accounts exist', async () => {
    const res = await api(user().cookie, '/api/accounts')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it('returns created accounts', async () => {
    await createAccount(user().cookie, { name: 'My Visa' })
    const res = await api(user().cookie, '/api/accounts')
    const data = await res.json()
    expect(data).toHaveLength(1)
    expect(data[0].name).toBe('My Visa')
  })
})

describe('POST /api/accounts', () => {
  it('creates an account and returns it', async () => {
    const res = await api(user().cookie, '/api/accounts', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Chase Sapphire',
        type: 'credit_card',
        institution: 'Chase',
        lastFour: '1234',
      }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.id).toBeTypeOf('number')
    expect(data.name).toBe('Chase Sapphire')
    expect(data.institution).toBe('Chase')
    expect(data.lastFour).toBe('1234')
  })

  it('rejects missing name with 400', async () => {
    const res = await api(user().cookie, '/api/accounts', {
      method: 'POST',
      body: JSON.stringify({ type: 'checking' }),
    })
    expect(res.status).toBe(400)
  })
})

describe('PATCH /api/accounts/:id', () => {
  it('updates account name and institution', async () => {
    const account = await createAccount(user().cookie)
    const res = await api(user().cookie, `/api/accounts/${account.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated Name', institution: 'New Bank' }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.name).toBe('Updated Name')
    expect(data.institution).toBe('New Bank')
  })

  it('returns 404 for a non-existent account', async () => {
    const res = await api(user().cookie, '/api/accounts/99999999', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Nope' }),
    })
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/accounts/:id', () => {
  it('deletes the account', async () => {
    const account = await createAccount(user().cookie)
    const res = await api(user().cookie, `/api/accounts/${account.id}`, { method: 'DELETE' })
    expect(res.status).toBe(200)

    const listRes = await api(user().cookie, '/api/accounts')
    const accounts = await listRes.json()
    expect(accounts.find((a: { id: number }) => a.id === account.id)).toBeUndefined()
  })

  it('returns 404 for a non-existent account', async () => {
    const res = await api(user().cookie, '/api/accounts/99999999', { method: 'DELETE' })
    expect(res.status).toBe(404)
  })
})

describe('GET /api/accounts/institutions', () => {
  it('returns an empty array when no accounts have institutions', async () => {
    await createAccount(user().cookie, { name: 'No Institution' })
    const res = await api(user().cookie, '/api/accounts/institutions')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it('returns distinct institution names sorted alphabetically', async () => {
    await createAccount(user().cookie, { name: 'Acc 1', institution: 'Wells Fargo' })
    await createAccount(user().cookie, { name: 'Acc 2', institution: 'Chase' })
    await createAccount(user().cookie, { name: 'Acc 3', institution: 'Chase' }) // duplicate
    const res = await api(user().cookie, '/api/accounts/institutions')
    const data = await res.json()
    expect(data).toEqual(['Chase', 'Wells Fargo'])
  })
})
