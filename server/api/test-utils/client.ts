/**
 * Shared helpers for API integration tests.
 *
 * Each test file should call `useTestUser()` at the top level (outside any
 * `describe` block). This registers beforeAll/afterAll/beforeEach hooks that:
 *   - Create a fresh test user before the file's tests run
 *   - Truncate all data tables before each individual test
 *   - Delete the test user (and cascade all their data) after the file finishes
 */
import { beforeAll, afterAll, beforeEach } from 'vitest'
import { Pool } from 'pg'

export const BASE_URL = `http://127.0.0.1:${process.env.TEST_API_PORT ?? '4173'}`

export interface TestUser {
  id: number
  email: string
  cookie: string
}

// ---------------------------------------------------------------------------
// DB helpers (direct Postgres connection for setup/teardown, not via the API)
// ---------------------------------------------------------------------------

let _pool: Pool | null = null

function getPool(): Pool {
  if (!_pool) {
    if (!process.env.STORAGE_DATABASE_URL) {
      throw new Error('STORAGE_DATABASE_URL must be set to run API tests')
    }
    _pool = new Pool({ connectionString: process.env.STORAGE_DATABASE_URL })
  }
  return _pool
}

/**
 * Truncate all per-user data tables between tests.
 * Uses RESTART IDENTITY CASCADE so sequences reset and FK children are cleared.
 * The `users` table is intentionally excluded — test users persist for the
 * duration of their test file.
 */
export async function truncateData(): Promise<void> {
  await getPool().query(
    `TRUNCATE accounts, categories, merchants, api_tokens, oauth_codes
     RESTART IDENTITY CASCADE`,
  )
}

export async function deleteUser(userId: number): Promise<void> {
  await getPool().query('DELETE FROM users WHERE id = $1', [userId])
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

/** Make an unauthenticated JSON request to the test server. */
export async function apiAnon(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...init.headers },
  })
}

/** Make an authenticated JSON request using the given session cookie. */
export async function api(
  cookie: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', cookie, ...init.headers },
  })
}

// ---------------------------------------------------------------------------
// User helpers
// ---------------------------------------------------------------------------

export function uniqueEmail(): string {
  return `api-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`
}

/** Register a new user via the API; returns id, email, and auth cookie. */
export async function registerUser(
  email: string,
  password = 'TestPass123!',
): Promise<TestUser> {
  const res = await apiAnon('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`registerUser failed (${res.status}): ${text}`)
  }
  const data = await res.json()
  const cookie = res.headers.get('set-cookie')?.split(';')[0] ?? ''
  return { id: data.id, email: data.email, cookie }
}

// ---------------------------------------------------------------------------
// Test lifecycle helper
// ---------------------------------------------------------------------------

/**
 * Call once at the top level of each test file.
 * Registers beforeAll / afterAll / beforeEach hooks for user lifecycle and
 * data cleanup, then returns a `user()` accessor so tests can read the
 * current test user after the hooks have run.
 */
export function useTestUser(): { user: () => TestUser } {
  let _user: TestUser

  beforeAll(async () => {
    _user = await registerUser(uniqueEmail())
  })

  afterAll(async () => {
    if (_user) await deleteUser(_user.id)
  })

  beforeEach(async () => {
    await truncateData()
  })

  return {
    user: () => _user,
  }
}
