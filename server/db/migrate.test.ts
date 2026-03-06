import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const neonSpy = vi.fn(() => ({ client: 'neon-client' }))
const neonDrizzleSpy = vi.fn(() => ({ orm: 'neon-db' }))
const neonMigrateSpy = vi.fn(async () => {})

const pgliteCtorSpy = vi.fn(function PGliteMock(this: any) {
  this.client = 'pglite-client'
})
const pgliteDrizzleSpy = vi.fn(() => ({ orm: 'pglite-db' }))
const pgliteMigrateSpy = vi.fn(async () => {})

vi.mock('@neondatabase/serverless', () => ({
  neon: neonSpy,
}))

vi.mock('drizzle-orm/neon-http', () => ({
  drizzle: neonDrizzleSpy,
}))

vi.mock('drizzle-orm/neon-http/migrator', () => ({
  migrate: neonMigrateSpy,
}))

vi.mock('@electric-sql/pglite', () => ({
  PGlite: pgliteCtorSpy,
}))

vi.mock('drizzle-orm/pglite', () => ({
  drizzle: pgliteDrizzleSpy,
}))

vi.mock('drizzle-orm/pglite/migrator', () => ({
  migrate: pgliteMigrateSpy,
}))

import { resolveDatabaseMode, runMigrations } from './migrate'

describe('migrate selection logic', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.resetAllMocks()
    process.env = { ...originalEnv }
    delete process.env.STORAGE_DATABASE_URL
    delete process.env.DATABASE_URL
    delete process.env.DATABASE_PATH
    delete process.env.NODE_ENV
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('resolveDatabaseMode prefers neon when DATABASE_URL is present', () => {
    expect(resolveDatabaseMode({ DATABASE_URL: 'postgres://example' } as NodeJS.ProcessEnv)).toBe('neon')
  })

  it('resolveDatabaseMode returns pglite for non-production without database URL', () => {
    expect(resolveDatabaseMode({ NODE_ENV: 'development' } as NodeJS.ProcessEnv)).toBe('pglite')
  })

  it('resolveDatabaseMode throws in production without database URL', () => {
    expect(() => resolveDatabaseMode({ NODE_ENV: 'production' } as NodeJS.ProcessEnv)).toThrow(
      'Production requires DATABASE_URL (or STORAGE_DATABASE_URL). Refusing to fall back to PGlite.',
    )
  })

  it('runMigrations uses neon migrator when database url is present', async () => {
    process.env.DATABASE_URL = 'postgres://example'

    await runMigrations()

    expect(neonSpy).toHaveBeenCalledTimes(1)
    expect(neonDrizzleSpy).toHaveBeenCalledTimes(1)
    expect(neonMigrateSpy).toHaveBeenCalledTimes(1)
    expect(pgliteCtorSpy).not.toHaveBeenCalled()
  })

  it('runMigrations uses pglite migrator for local development without database url', async () => {
    process.env.NODE_ENV = 'development'

    await runMigrations()

    expect(pgliteCtorSpy).toHaveBeenCalledTimes(1)
    expect(pgliteDrizzleSpy).toHaveBeenCalledTimes(1)
    expect(pgliteMigrateSpy).toHaveBeenCalledTimes(1)
    expect(neonSpy).not.toHaveBeenCalled()
  })

  it('runMigrations fails fast in production without database url', async () => {
    process.env.NODE_ENV = 'production'

    await expect(runMigrations()).rejects.toThrow(
      'Production requires DATABASE_URL (or STORAGE_DATABASE_URL). Refusing to fall back to PGlite.',
    )

    expect(pgliteCtorSpy).not.toHaveBeenCalled()
    expect(neonSpy).not.toHaveBeenCalled()
  })
})
