import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const neonSpy = vi.fn(() => ({ client: 'neon-client' }))
const neonDrizzleSpy = vi.fn(() => ({ orm: 'neon-db' }))
const neonMigrateSpy = vi.fn(async () => {})

vi.mock('@neondatabase/serverless', () => ({
  neon: neonSpy,
}))

vi.mock('drizzle-orm/neon-http', () => ({
  drizzle: neonDrizzleSpy,
}))

vi.mock('drizzle-orm/neon-http/migrator', () => ({
  migrate: neonMigrateSpy,
}))

import { getRequiredDatabaseUrl, runMigrations } from './migrate'

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

  it('runMigrations uses neon migrator', async () => {
    process.env.STORAGE_DATABASE_URL = 'postgres://example'

    await runMigrations()

    expect(neonSpy).toHaveBeenCalledTimes(1)
    expect(neonDrizzleSpy).toHaveBeenCalledTimes(1)
    expect(neonMigrateSpy).toHaveBeenCalledTimes(1)
  })

  it('runMigrations fails fast without database url', async () => {
    await expect(runMigrations()).rejects.toThrow('STORAGE_DATABASE_URL is required in all environments.')

    expect(neonSpy).not.toHaveBeenCalled()
  })
})
