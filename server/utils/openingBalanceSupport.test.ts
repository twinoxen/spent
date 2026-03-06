import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  __resetOpeningBalanceColumnCacheForTests,
  getOpeningBalanceColumnExists,
  logAccountsQueryError,
  pathForOpeningBalanceSupport,
} from './openingBalanceSupport'

describe('openingBalanceSupport', () => {
  beforeEach(() => {
    __resetOpeningBalanceColumnCacheForTests()
    vi.restoreAllMocks()
  })

  it('returns query path A when opening-balance column exists and B otherwise', () => {
    expect(pathForOpeningBalanceSupport(true)).toBe('A')
    expect(pathForOpeningBalanceSupport(false)).toBe('B')
  })

  it('caches information_schema probe result for ttl window', async () => {
    const execute = vi.fn(async () => [{ exists: true }])
    const db = { execute }

    const first = await getOpeningBalanceColumnExists(db)
    const second = await getOpeningBalanceColumnExists(db)

    expect(first).toBe(true)
    expect(second).toBe(true)
    expect(execute).toHaveBeenCalledTimes(1)
  })

  it('returns false when information_schema probe reports missing column', async () => {
    const db = {
      execute: vi.fn(async () => [{ exists: false }]),
    }

    await expect(getOpeningBalanceColumnExists(db)).resolves.toBe(false)
    expect(db.execute).toHaveBeenCalledTimes(1)
  })

  it('logs sanitized error details without raw SQL/message body', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    logAccountsQueryError('api/accounts', new Error('Failed query: select * from very_long_sql_here'), 'B')

    expect(errorSpy).toHaveBeenCalledTimes(1)
    const [, payload] = errorSpy.mock.calls[0]
    expect(payload).toMatchObject({ queryPath: 'B' })
    expect(payload).toHaveProperty('messageLength')
    expect(payload).not.toHaveProperty('message')
  })
})
