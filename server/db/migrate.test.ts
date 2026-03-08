import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const neonSpy = vi.fn(() => ({ client: 'neon-client' }))
const neonDrizzleSpy = vi.fn(() => ({ orm: 'neon-db' }))
const neonMigrateSpy = vi.fn(async () => {})

const pgPoolEndSpy = vi.fn(async () => {})
// Must use a regular function (not arrow) so it can be called with `new`
const PgPoolSpy = vi.fn(function (this: Record<string, unknown>) {
  this.end = pgPoolEndSpy
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
  Pool: PgPoolSpy,
}))

vi.mock('drizzle-orm/node-postgres', () => ({
  drizzle: pgDrizzleSpy,
}))

vi.mock('drizzle-orm/node-postgres/migrator', () => ({
  migrate: pgMigrateSpy,
}))

import { getRequiredDatabaseUrl, isNeonUrl, runMigrations } from './migrate'

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

  describe('isNeonUrl', () => {
    it('returns true for neon.tech URLs', () => {
      expect(isNeonUrl('postgres://user:pass@ep-xxx.us-east-1.aws.neon.tech/db')).toBe(true)
    })

    it('returns false for localhost URLs', () => {
      expect(isNeonUrl('postgresql://spent:spent@localhost:5432/spent')).toBe(false)
    })

    it('returns false for generic postgres URLs', () => {
      expect(isNeonUrl('postgres://user:pass@example.com/db')).toBe(false)
    })
  })

  it('runMigrations uses neon migrator for neon.tech URLs', async () => {
    process.env.STORAGE_DATABASE_URL = 'postgres://user:pass@ep-jolly-shadow.us-east-1.aws.neon.tech/neondb'

    await runMigrations()

    expect(neonSpy).toHaveBeenCalledTimes(1)
    expect(neonDrizzleSpy).toHaveBeenCalledTimes(1)
    expect(neonMigrateSpy).toHaveBeenCalledTimes(1)
    expect(PgPoolSpy).not.toHaveBeenCalled()
  })

  it('runMigrations uses node-postgres migrator for local URLs', async () => {
    process.env.STORAGE_DATABASE_URL = 'postgresql://spent:spent@localhost:5432/spent'

    await runMigrations()

    expect(PgPoolSpy).toHaveBeenCalledTimes(1)
    expect(pgDrizzleSpy).toHaveBeenCalledTimes(1)
    expect(pgMigrateSpy).toHaveBeenCalledTimes(1)
    expect(pgPoolEndSpy).toHaveBeenCalledTimes(1)
    expect(neonSpy).not.toHaveBeenCalled()
  })

  it('runMigrations fails fast without database url', async () => {
    await expect(runMigrations()).rejects.toThrow('STORAGE_DATABASE_URL is required in all environments.')

    expect(neonSpy).not.toHaveBeenCalled()
  })
})
