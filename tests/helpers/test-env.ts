import { createTestDb, type TestDb } from './test-db';

/**
 * Point process.env at an isolated, migrated database so code that uses
 * getContainer()/getEnv() runs against it. Vitest runs each test file in its own
 * fork, so module-level caches (env, container) start fresh per file.
 */
export async function useTestEnvironment(extra: Record<string, string> = {}): Promise<TestDb> {
  const t = await createTestDb();
  Object.assign(process.env, {
    DATABASE_URL: t.url,
    DATA_DIR: t.dir,
    LOG_LEVEL: 'silent',
    ...extra,
  });
  return t;
}
