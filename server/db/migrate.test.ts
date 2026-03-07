import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const neonSpy = vi.fn(() => ({ client: 'neon-client' }))
const neonDrizzleSpy = vi.fn(() => ({ orm: 'neon-db' }))
const neonMigrateSpy = vi.fn(async () => {})

const poolEndSpy = vi.fn(async () => {})
const poolSpy = vi.fn(function MockPool(this: any) {
  return { end: poolEndSpy }
})
const pgDrizzleSpy = vi.fn(() => ({ orm: 'pg-db' }))
const pgMigrateSpy = vi.fn(async () => {})

vi.mock('@neondatabase/serverless', () => ({
  neon: neonSpy,
}))

vi.mock('drizzle-orm/neon-http', () => ({
  drizzle: neonDrizzleSpy,
}))

vi.mock('drizzle-orm/neon-http/migrator', () => ({
  migrate: neonMigrateSpy,
}))

vi.mock('pg', () => ({
  Pool: poolSpy,
}))

vi.mock('drizzle-orm/node-postgres', () => ({
  drizzle: pgDrizzleSpy,
}))

vi.mock('drizzle-orm/node-postgres/migrator', () => ({
  migrate: pgMigrateSpy,
}))

import { getRequiredDatabaseUrl, resolveDatabaseDriver, runMigrations } from './migrate'

describe('migrate configuration', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.resetAllMocks()
    process.env = { ...originalEnv }
    delete process.env.STORAGE_DATABASE_URL
    delete process.env.NODE_ENV
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('getRequiredDatabaseUrl returns STORAGE_DATABASE_URL when present', () => {
    expect(getRequiredDatabaseUrl({ STORAGE_DATABASE_URL: 'postgres://storage' } as NodeJS.ProcessEnv)).toBe(
      'postgres://storage',
    )
  })

  it('getRequiredDatabaseUrl throws when no database url is provided', () => {
    expect(() => getRequiredDatabaseUrl({} as NodeJS.ProcessEnv)).toThrow(
      'STORAGE_DATABASE_URL is required in all environments.',
    )
  })

  it('resolveDatabaseDriver uses node-postgres for localhost urls', () => {
    expect(resolveDatabaseDriver('postgresql://spent:spent@localhost:5432/spent')).toBe('node-postgres')
  })

  it('resolveDatabaseDriver defaults to neon-http for non-localhost urls', () => {
    expect(resolveDatabaseDriver('postgresql://user:pass@db.neon.tech/db')).toBe('neon-http')
  })

  it('runMigrations uses neon migrator for non-localhost urls', async () => {
    process.env.STORAGE_DATABASE_URL = 'postgres://example@db.neon.tech/spent'

    await runMigrations()

    expect(neonSpy).toHaveBeenCalledTimes(1)
    expect(neonDrizzleSpy).toHaveBeenCalledTimes(1)
    expect(neonMigrateSpy).toHaveBeenCalledTimes(1)
    expect(poolSpy).not.toHaveBeenCalled()
  })

  it('runMigrations uses node-postgres migrator for localhost urls', async () => {
    process.env.STORAGE_DATABASE_URL = 'postgresql://spent:spent@localhost:5432/spent'

    await runMigrations()

    expect(poolSpy).toHaveBeenCalledTimes(1)
    expect(pgDrizzleSpy).toHaveBeenCalledTimes(1)
    expect(pgMigrateSpy).toHaveBeenCalledTimes(1)
    expect(poolEndSpy).toHaveBeenCalledTimes(1)
    expect(neonSpy).not.toHaveBeenCalled()
  })

  it('runMigrations fails fast without database url', async () => {
    await expect(runMigrations()).rejects.toThrow('STORAGE_DATABASE_URL is required in all environments.')

    expect(neonSpy).not.toHaveBeenCalled()
    expect(poolSpy).not.toHaveBeenCalled()
  })
})
