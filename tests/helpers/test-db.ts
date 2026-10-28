import Database from 'better-sqlite3';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createPrismaClient, type Db } from '@/infrastructure/db/prisma';

const MIGRATIONS_DIR = path.resolve(__dirname, '../../prisma/migrations');

export interface TestDb {
  readonly db: Db;
  readonly dir: string;
  readonly file: string;
  readonly url: string;
  cleanup(): Promise<void>;
}

/** Apply every migration.sql in order to a fresh SQLite file. */
export function applyMigrations(file: string): void {
  const sqlite = new Database(file);
  try {
    const folders = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
    for (const folder of folders) {
      sqlite.exec(readFileSync(path.join(MIGRATIONS_DIR, folder, 'migration.sql'), 'utf8'));
    }
  } finally {
    sqlite.close();
  }
}

/**
 * Create an isolated, migrated temporary database for one test file (E-00-03 AC-4).
 * Call `cleanup()` in afterAll.
 */
export async function createTestDb(): Promise<TestDb> {
  const dir = mkdtempSync(path.join(tmpdir(), 'hrm-test-'));
  const file = path.join(dir, 'test.db');
  applyMigrations(file);
  const url = `file:${file}`;
  const db = await createPrismaClient(url);
  return {
    db,
    dir,
    file,
    url,
    async cleanup() {
      await db.$disconnect();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
