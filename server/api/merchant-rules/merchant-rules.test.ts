import { describe, it, expect, beforeEach } from 'vitest'
import { api, useTestUser } from '../test-utils/client'

const { user } = useTestUser()

let categoryId: number

beforeEach(async () => {
  const res = await api(user().cookie, '/api/categories', {
    method: 'POST',
    body: JSON.stringify({ name: 'Shopping' }),
  })
  categoryId = (await res.json()).id
})

async function createRule(overrides: Record<string, unknown> = {}) {
  const res = await api(user().cookie, '/api/merchant-rules', {
    method: 'POST',
    body: JSON.stringify({ pattern: 'amazon', categoryId, ...overrides }),
  })
  expect(res.status).toBe(200)
  const { rule } = await res.json()
  return rule
}

describe('GET /api/merchant-rules', () => {
  it('returns an empty array when no rules exist', async () => {
    const res = await api(user().cookie, '/api/merchant-rules')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it('returns created rules with their category', async () => {
    await createRule({ pattern: 'starbucks' })
    const res = await api(user().cookie, '/api/merchant-rules')
    const data = await res.json()
    expect(data).toHaveLength(1)
    expect(data[0].pattern).toBe('starbucks')
    expect(data[0].category.id).toBe(categoryId)
  })

  it('supports ?categoryId to filter rules', async () => {
    const secondCatRes = await api(user().cookie, '/api/categories', {
      method: 'POST',
      body: JSON.stringify({ name: 'Food' }),
    })
    const secondCategoryId = (await secondCatRes.json()).id

    await createRule({ pattern: 'amazon', categoryId })
    await createRule({ pattern: 'mcdonalds', categoryId: secondCategoryId })

    const res = await api(user().cookie, `/api/merchant-rules?categoryId=${categoryId}`)
    const data = await res.json()
    expect(data).toHaveLength(1)
    expect(data[0].pattern).toBe('amazon')
  })
})

describe('POST /api/merchant-rules', () => {
  it('creates a rule and returns it', async () => {
    const res = await api(user().cookie, '/api/merchant-rules', {
      method: 'POST',
      body: JSON.stringify({ pattern: 'netflix', categoryId, priority: 150 }),
    })
    expect(res.status).toBe(200)
    const { rule, affectedCount } = await res.json()
    expect(rule.id).toBeTypeOf('number')
    expect(rule.pattern).toBe('netflix')
    expect(rule.priority).toBe(150)
    expect(affectedCount).toBe(0)
  })

  it('rejects missing pattern with 400', async () => {
    const res = await api(user().cookie, '/api/merchant-rules', {
      method: 'POST',
      body: JSON.stringify({ categoryId }),
    })
    expect(res.status).toBe(400)
  })

  it('rejects missing categoryId with 400', async () => {
    const res = await api(user().cookie, '/api/merchant-rules', {
      method: 'POST',
      body: JSON.stringify({ pattern: 'amazon' }),
    })
    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/merchant-rules/:id', () => {
  it('deletes the rule', async () => {
    const rule = await createRule()
    const res = await api(user().cookie, `/api/merchant-rules/${rule.id}`, { method: 'DELETE' })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)

    const listRes = await api(user().cookie, '/api/merchant-rules')
    expect(await listRes.json()).toHaveLength(0)
  })

  it('returns 404 for a non-existent rule', async () => {
    const res = await api(user().cookie, '/api/merchant-rules/99999999', { method: 'DELETE' })
    expect(res.status).toBe(404)
  })
})
