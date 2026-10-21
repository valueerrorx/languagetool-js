import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 120000, // English tests build the full rule set (6000+ pattern rules) and run in parallel workers
    hookTimeout: 120000,
    maxWorkers: 6,
    minWorkers: 1,
    include: ['tests/**/*.test.js'],
    exclude: ['tests/golden/**', 'node_modules/**'],
  },
});
