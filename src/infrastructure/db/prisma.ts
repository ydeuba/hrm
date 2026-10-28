import 'server-only';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../../../generated/prisma/client';

export type Db = PrismaClient;

/**
 * Create a Prisma client bound to a SQLite file via the better-sqlite3 driver
 * adapter (ADR-003). WAL improves read concurrency; foreign keys must be enabled
 * per connection for referential actions (cascade / restrict) to apply.
 */
export async function createPrismaClient(databaseUrl: string): Promise<Db> {
  const client = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: databaseUrl }) });
  await client.$queryRawUnsafe('PRAGMA journal_mode = WAL');
  await client.$executeRawUnsafe('PRAGMA foreign_keys = ON');
  await client.$executeRawUnsafe('PRAGMA busy_timeout = 5000');
  return client;
}
