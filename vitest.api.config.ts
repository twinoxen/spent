import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['server/api/**/*.test.ts'],
    globalSetup: ['./server/api/test-utils/global-setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // Run test files sequentially, one at a time.
    // The tests share one server instance and one Postgres DB; concurrent
    // file execution would interleave beforeAll seeds with beforeEach
    // truncations, causing FK violations and 404s everywhere.
    fileParallelism: false,
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
    reporters: process.env.CI ? ['github-actions', 'verbose'] : ['verbose'],
  },
})
