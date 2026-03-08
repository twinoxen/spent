import { describe, it, expect } from 'vitest'
import { api, useTestUser } from '../test-utils/client'

const { user } = useTestUser()

async function createCategory(
  cookie: string,
  overrides: Record<string, unknown> = {},
) {
  const res = await api(cookie, '/api/categories', {
    method: 'POST',
    body: JSON.stringify({ name: 'Test Category', ...overrides }),
  })
  expect(res.status).toBe(200)
  return res.json()
}

describe('GET /api/categories', () => {
  it('returns empty flat list and empty tree when no categories exist', async () => {
    const res = await api(user().cookie, '/api/categories')
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.categories).toEqual([])
    expect(data.tree).toEqual([])
  })

  it('returns flat list and tree after creating categories', async () => {
    const parent = await createCategory(user().cookie, { name: 'Food' })
    await createCategory(user().cookie, { name: 'Restaurants', parentId: parent.id })

    const res = await api(user().cookie, '/api/categories')
    const data = await res.json()

    expect(data.categories).toHaveLength(2)
    expect(data.tree).toHaveLength(1)
    expect(data.tree[0].name).toBe('Food')
    expect(data.tree[0].children).toHaveLength(1)
    expect(data.tree[0].children[0].name).toBe('Restaurants')
  })
})

describe('POST /api/categories', () => {
  it('creates a root category', async () => {
    const res = await api(user().cookie, '/api/categories', {
      method: 'POST',
      body: JSON.stringify({ name: 'Travel', color: '#0ea5e9' }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.id).toBeTypeOf('number')
    expect(data.name).toBe('Travel')
    expect(data.color).toBe('#0ea5e9')
    expect(data.parentId).toBeNull()
  })

  it('creates a child category linked to its parent', async () => {
    const parent = await createCategory(user().cookie, { name: 'Travel' })
    const res = await api(user().cookie, '/api/categories', {
      method: 'POST',
      body: JSON.stringify({ name: 'Flights', parentId: parent.id }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.parentId).toBe(parent.id)
  })

  it('rejects empty name with 400', async () => {
    const res = await api(user().cookie, '/api/categories', {
      method: 'POST',
      body: JSON.stringify({ name: '' }),
    })
    expect(res.status).toBe(400)
  })
})

describe('PATCH /api/categories/:id', () => {
  it('updates name and color', async () => {
    const category = await createCategory(user().cookie, { name: 'Old Name' })
    const res = await api(user().cookie, `/api/categories/${category.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: 'New Name', color: '#ff0000' }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.name).toBe('New Name')
    expect(data.color).toBe('#ff0000')
  })

  it('returns 404 for a non-existent category', async () => {
    const res = await api(user().cookie, '/api/categories/99999999', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Nope' }),
    })
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/categories/:id', () => {
  it('deletes the category', async () => {
    const category = await createCategory(user().cookie)
    const res = await api(user().cookie, `/api/categories/${category.id}`, { method: 'DELETE' })
    expect(res.status).toBe(200)

    const listRes = await api(user().cookie, '/api/categories')
    const { categories } = await listRes.json()
    expect(categories.find((c: { id: number }) => c.id === category.id)).toBeUndefined()
  })

  it('deletes a parent and cascades to children', async () => {
    const parent = await createCategory(user().cookie, { name: 'Parent' })
    await createCategory(user().cookie, { name: 'Child', parentId: parent.id })

    const res = await api(user().cookie, `/api/categories/${parent.id}`, { method: 'DELETE' })
    expect(res.status).toBe(200)

    const listRes = await api(user().cookie, '/api/categories')
    const { categories } = await listRes.json()
    expect(categories).toHaveLength(0)
  })

  it('returns 404 for a non-existent category', async () => {
    const res = await api(user().cookie, '/api/categories/99999999', { method: 'DELETE' })
    expect(res.status).toBe(404)
  })
})
