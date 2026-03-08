import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['server/api/**/*.test.ts'],
    globalSetup: ['./server/api/test-utils/global-setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // Run all API test files sequentially in a single worker — the tests
    // share one server instance and one DB, so parallelism would cause races.
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
    reporters: process.env.CI ? ['github-actions', 'verbose'] : ['verbose'],
  },
})
