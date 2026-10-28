import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/** Performance suite (E-04-07): `npm run test:perf`. Not part of the default run. */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'server-only': fileURLToPath(new URL('./node_modules/server-only/empty.js', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/perf/**/*.test.ts'],
    pool: 'forks',
    testTimeout: 300_000,
  },
});
