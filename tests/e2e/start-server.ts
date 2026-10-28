/**
 * Playwright web server: builds the app and serves it against an isolated,
 * migrated and seeded temporary database, so e2e runs never touch ./data.
 * Run with `tsx --conditions=react-server` (server-only modules).
 */
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createPrismaClient } from '../../src/infrastructure/db/prisma';
import { seedReferenceData } from '../../src/infrastructure/db/seed-reference';
import { createContainer } from '../../src/infrastructure/container';
import { loadEnv } from '../../src/infrastructure/env';
import { applyMigrations } from '../helpers/test-db';
import { E2E_ADMIN } from './e2e-constants';

const port = process.env.E2E_PORT ?? '3100';
const dataDir = mkdtempSync(path.join(tmpdir(), 'hrm-e2e-'));
const dbFile = path.join(dataDir, 'hrm.db');
const env: NodeJS.ProcessEnv & { DATABASE_URL: string } = {
  ...process.env,
  NODE_ENV: 'production',
  DATABASE_URL: `file:${dbFile}`,
  DATA_DIR: dataDir,
  LOG_LEVEL: 'warn',
  NEXT_TELEMETRY_DISABLED: '1',
};

async function prepareDatabase(): Promise<void> {
  applyMigrations(dbFile);
  const db = await createPrismaClient(env.DATABASE_URL);
  try {
    await seedReferenceData(db);
  } finally {
    await db.$disconnect();
  }
  const container = await createContainer(loadEnv(env));
  try {
    const created = await container.useCases.createInitialAdmin.execute(E2E_ADMIN);
    if (!created.ok) throw new Error(`Could not seed e2e admin: ${created.error}`);
  } finally {
    await container.close();
  }
}

function run(cmd: string, args: string[]): void {
  const r = spawnSync(cmd, args, { stdio: 'inherit', env, shell: process.platform === 'win32' });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed with ${r.status}`);
}

async function main(): Promise<void> {
  await prepareDatabase();
  if (process.env.E2E_SKIP_BUILD !== '1') run('npx', ['next', 'build']);
  const server: ChildProcess = spawn('npx', ['next', 'start', '-p', port], {
    stdio: 'inherit',
    env,
    shell: process.platform === 'win32',
  });
  const stop = () => server.kill();
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  server.on('exit', (code: number | null) => process.exit(code ?? 0));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
