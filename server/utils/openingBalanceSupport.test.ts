import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  __resetOpeningBalanceColumnCacheForTests,
  getOpeningBalanceColumnExists,
  isMissingOpeningBalanceColumn,
} from './openingBalanceSupport'

describe('openingBalanceSupport', () => {
  beforeEach(() => {
    __resetOpeningBalanceColumnCacheForTests()
  })

  it('detects missing is_opening_balance postgres error', () => {
    expect(isMissingOpeningBalanceColumn({ code: '42703', message: 'column "is_opening_balance" does not exist' })).toBe(true)
    expect(isMissingOpeningBalanceColumn({ code: '42P01', message: 'relation missing' })).toBe(false)
  })

  it('caches information_schema probe result for short ttl window', async () => {
    const execute = vi.fn(async () => [{ exists: true }])
    const db = { execute }

    const first = await getOpeningBalanceColumnExists(db)
    const second = await getOpeningBalanceColumnExists(db)

    expect(first).toBe(true)
    expect(second).toBe(true)
    expect(execute).toHaveBeenCalledTimes(1)
  })

  it('returns false when probing hits missing-column error', async () => {
    const db = {
      execute: vi.fn(async () => {
        throw { code: '42703', message: 'column "is_opening_balance" does not exist' }
      }),
    }

    await expect(getOpeningBalanceColumnExists(db)).resolves.toBe(false)
  })
})
