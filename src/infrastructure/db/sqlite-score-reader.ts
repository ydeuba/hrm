import 'server-only';
import Database from 'better-sqlite3';
import type { ScoreStatusDb } from './repositories/score-mapping';

export type ScoreTuple = readonly [employeeId: string, sprintId: string, status: ScoreStatusDb, valueCenti: number | null];

export interface FastScoreReader {
  /** `null` = every sprint (full scan, ~2× faster than an IN filter at 100k rows). */
  read(sprintIds: readonly string[] | null): ScoreTuple[];
  close(): void;
}

const COLUMNS = `"employeeId", "sprintId", "status", "valueCenti"`;

/**
 * Read-only fast path for the dashboard score matrix on SQLite (NFR-04).
 * better-sqlite3 in raw (array) mode avoids per-row object mapping, the
 * dominant cost at 100k cells. The connection opens lazily on first read; WAL
 * lets it read while Prisma writes. Returns null for non-SQLite databases.
 */
export function createSqliteScoreReader(databaseUrl: string): FastScoreReader | null {
  if (!databaseUrl.startsWith('file:')) return null;
  let db: Database.Database | null = null;
  const open = () => {
    db ??= new Database(databaseUrl.slice('file:'.length), { readonly: true, fileMustExist: true });
    return db;
  };
  return {
    read(sprintIds) {
      if (sprintIds?.length === 0) return [];
      const conn = open();
      if (sprintIds === null) return conn.prepare(`SELECT ${COLUMNS} FROM "Score"`).raw(true).all() as ScoreTuple[];
      const placeholders = sprintIds.map(() => '?').join(',');
      return conn.prepare(`SELECT ${COLUMNS} FROM "Score" WHERE "sprintId" IN (${placeholders})`).raw(true).all(...sprintIds) as ScoreTuple[];
    },
    close() {
      db?.close();
      db = null;
    },
  };
}
