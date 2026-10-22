import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 120000, // English tests build the full rule set (6000+ pattern rules) and run in parallel workers
    hookTimeout: 120000,
    // checks run in the test thread (worker threads: parity cases and tests/server/CheckWorkers.test.js); ported Java tests run without
    // the LTJS rule layer (D-061), tests/lang/de/ltjs/ switch it on where needed
    env: { LTJS_CHECK_BACKEND: 'inline', LTJS_EXTRA_RULES: '0' },
    maxWorkers: 6,
    minWorkers: 1,
    include: ['tests/**/*.test.js'],
    exclude: ['tests/golden/**', 'node_modules/**'],
  },
});
