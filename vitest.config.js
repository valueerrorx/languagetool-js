import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 120000, // English tests build the full rule set (6000+ pattern rules) and run in parallel workers
    hookTimeout: 120000,
    env: { LTJS_CHECK_BACKEND: 'inline' }, // checks run in the test thread; worker threads are covered by the parity cases and tests/server/CheckWorkers.test.js
    maxWorkers: 6,
    minWorkers: 1,
    include: ['tests/**/*.test.js'],
    exclude: ['tests/golden/**', 'node_modules/**'],
  },
});
