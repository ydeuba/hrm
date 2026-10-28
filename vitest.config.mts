import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // `server-only` throws outside the react-server condition; tests run server code directly.
      'server-only': fileURLToPath(new URL('./node_modules/server-only/empty.js', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts', 'src/**/*.test.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
    pool: 'forks',
    // Integration files each hash a password (argon2) and import the sample workbook in beforeAll;
    // capping workers keeps that CPU-bound setup, and the login timing test, from starving each other.
    maxWorkers: '50%',
    testTimeout: 20_000,
    hookTimeout: 60_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.d.ts',
        // React UI (.tsx) is covered by Playwright e2e, not unit coverage.
        'src/**/*.tsx',
        // Pure type/interface modules have no executable statements.
        'src/application/ports/**',
        'src/**/types.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
        'src/domain/**/*.ts': { lines: 100, functions: 100, branches: 100, statements: 100 },
      },
    },
  },
});
