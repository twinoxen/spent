import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['server/api/**/*.test.ts'],
    globalSetup: ['./server/api/test-utils/global-setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // Run test files sequentially, one at a time.
    // Concurrent file execution interleaves beforeAll seeds with beforeEach
    // truncations, causing FK violations and 404s.
    // Each file runs in its own short-lived process (default pool behaviour),
    // which also ensures the pg Pool is cleaned up on process exit.
    fileParallelism: false,
    reporters: process.env.CI ? ['github-actions', 'verbose'] : ['verbose'],
  },
})
