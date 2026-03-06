import { beforeEach, describe, expect, it, vi } from 'vitest'

const execute = vi.fn()
const getDb = vi.fn(async () => ({ execute }))
const getDbRuntimeInfo = vi.fn(() => ({
  databaseUrlSet: true,
  storageDatabaseUrlSet: false,
  resolvedDriverPath: 'neon-http',
}))

vi.mock('../../db', () => ({
  getDb,
  getDbRuntimeInfo,
}))

describe('/api/health/db', () => {
  beforeEach(() => {
    vi.resetModules()
    execute.mockReset()
    getDb.mockClear()
    getDbRuntimeInfo.mockClear()
    vi.unstubAllGlobals()
    vi.stubGlobal('defineEventHandler', (handler: any) => handler)
  })

  it('returns non-sensitive booleans and driver/check statuses', async () => {
    execute
      .mockResolvedValueOnce([{ exists: true }])
      .mockResolvedValueOnce([{ exists: true }])

    const handler = (await import('./db.get')).default
    const result = await handler()

    expect(result).toEqual({
      env: {
        databaseUrlSet: true,
        storageDatabaseUrlSet: false,
      },
      driver: 'neon-http',
      checks: {
        transactionsIsOpeningBalanceExists: true,
        drizzleMigrationsTableExists: true,
      },
    })
  })

  it('returns null checks and error strings when probes fail', async () => {
    execute
      .mockRejectedValueOnce(new Error('column probe failed'))
      .mockRejectedValueOnce(new Error('migration probe failed'))

    const handler = (await import('./db.get')).default
    const result = await handler()

    expect(result.env).toEqual({
      databaseUrlSet: true,
      storageDatabaseUrlSet: false,
    })
    expect(result.driver).toBe('neon-http')
    expect(result.checks).toEqual({
      transactionsIsOpeningBalanceExists: null,
      drizzleMigrationsTableExists: null,
    })
    expect(result.errors).toEqual({
      columnCheck: 'column probe failed',
      migrationTableCheck: 'migration probe failed',
    })
  })
})
