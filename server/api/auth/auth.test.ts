import { describe, it, expect } from 'vitest'
import { api, apiAnon, useTestUser, registerUser, uniqueEmail, deleteUser } from '../test-utils/client'

const { user } = useTestUser()

describe('POST /api/auth/register', () => {
  it('creates a user and returns id + email', async () => {
    const email = uniqueEmail()
    const res = await apiAnon('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password: 'TestPass123!' }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.id).toBeTypeOf('number')
    expect(data.email).toBe(email)
    expect(res.headers.get('set-cookie')).toContain('auth_token=')
    await deleteUser(data.id)
  })

  it('rejects duplicate email with 409', async () => {
    const res = await apiAnon('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: user().email, password: 'TestPass123!' }),
    })
    expect(res.status).toBe(409)
  })

  it('rejects missing password with 400', async () => {
    const res = await apiAnon('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: uniqueEmail() }),
    })
    expect(res.status).toBe(400)
  })

  it('rejects short password with 400', async () => {
    const res = await apiAnon('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: uniqueEmail(), password: 'short' }),
    })
    expect(res.status).toBe(400)
  })
})

describe('POST /api/auth/login', () => {
  it('returns user for valid credentials', async () => {
    const res = await apiAnon('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: user().email, password: 'TestPass123!' }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.id).toBe(user().id)
    expect(data.email).toBe(user().email)
    expect(res.headers.get('set-cookie')).toContain('auth_token=')
  })

  it('rejects wrong password with 401', async () => {
    const res = await apiAnon('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: user().email, password: 'WrongPassword!' }),
    })
    expect(res.status).toBe(401)
  })

  it('rejects unknown email with 401', async () => {
    const res = await apiAnon('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'nobody@nowhere.example.com', password: 'TestPass123!' }),
    })
    expect(res.status).toBe(401)
  })

  it('rejects missing credentials with 400', async () => {
    const res = await apiAnon('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
  })
})

describe('GET /api/auth/me', () => {
  it('returns current user when authenticated', async () => {
    const res = await api(user().cookie, '/api/auth/me')
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.id).toBe(user().id)
    expect(data.email).toBe(user().email)
  })

  it('rejects unauthenticated requests with 401', async () => {
    const res = await apiAnon('/api/auth/me')
    expect(res.status).toBe(401)
  })
})

describe('POST /api/auth/logout', () => {
  it('returns success and clears the auth cookie', async () => {
    const res = await api(user().cookie, '/api/auth/logout', { method: 'POST' })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    // The Set-Cookie header should clear the cookie
    const setCookie = res.headers.get('set-cookie') ?? ''
    expect(setCookie).toMatch(/auth_token=;|auth_token=(?:;| |$)/)
  })
})

describe('GET /api/auth/tokens', () => {
  it('returns an empty array when no PATs exist', async () => {
    const res = await api(user().cookie, '/api/auth/tokens')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it('rejects unauthenticated requests with 401', async () => {
    const res = await apiAnon('/api/auth/tokens')
    expect(res.status).toBe(401)
  })
})

describe('POST /api/auth/tokens', () => {
  it('creates a PAT and returns id, name, and token string', async () => {
    const res = await api(user().cookie, '/api/auth/tokens', {
      method: 'POST',
      body: JSON.stringify({ name: 'CI token' }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.id).toBeTypeOf('number')
    expect(data.name).toBe('CI token')
    expect(data.token).toBeTypeOf('string')
    expect(data.token.split('.').length).toBe(3) // JWT format
  })

  it('rejects missing name with 400', async () => {
    const res = await api(user().cookie, '/api/auth/tokens', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
  })

  it('created token appears in GET /api/auth/tokens', async () => {
    await api(user().cookie, '/api/auth/tokens', {
      method: 'POST',
      body: JSON.stringify({ name: 'listed token' }),
    })
    const listRes = await api(user().cookie, '/api/auth/tokens')
    const tokens = await listRes.json()
    expect(tokens).toHaveLength(1)
    expect(tokens[0].name).toBe('listed token')
  })
})

describe('DELETE /api/auth/tokens/:id', () => {
  it('revokes a PAT so it no longer appears in the list', async () => {
    const createRes = await api(user().cookie, '/api/auth/tokens', {
      method: 'POST',
      body: JSON.stringify({ name: 'to revoke' }),
    })
    const { id } = await createRes.json()

    const deleteRes = await api(user().cookie, `/api/auth/tokens/${id}`, { method: 'DELETE' })
    expect(deleteRes.status).toBe(200)

    const listRes = await api(user().cookie, '/api/auth/tokens')
    const tokens = await listRes.json()
    expect(tokens.find((t: { id: number }) => t.id === id)).toBeUndefined()
  })
})

describe('DELETE /api/auth/me', () => {
  it('deletes the account and cascades all user data', async () => {
    // Use a disposable user so we don't break the shared test user
    const disposable = await registerUser(uniqueEmail())

    const res = await api(disposable.cookie, '/api/auth/me', { method: 'DELETE' })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)

    // The user should no longer be able to log in
    const loginRes = await apiAnon('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: disposable.email, password: 'TestPass123!' }),
    })
    expect(loginRes.status).toBe(401)
  })
})
