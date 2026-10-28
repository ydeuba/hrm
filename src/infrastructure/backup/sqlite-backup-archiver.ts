import 'server-only';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { BackupArchiver } from '@/application/ports/backup';
import type { Clock } from '@/application/ports/clock';
import type { Db } from '../db/prisma';
import { writeZip, type ZipEntry } from '../files/zip-writer';

/** Name of the database file inside the archive (restore copies it to DATABASE_URL). */
export const BACKUP_DB_NAME = 'hrm.db';

async function listFiles(dir: string, prefix: string): Promise<ZipEntry[]> {
  let items;
  try {
    items = await readdir(dir, { withFileTypes: true, recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
  const files = items.filter((d) => d.isFile());
  return Promise.all(
    files.map(async (f) => {
      const full = path.join(f.parentPath, f.name);
      return { name: `${prefix}/${path.relative(dir, full).split(path.sep).join('/')}`, bytes: new Uint8Array(await readFile(full)) };
    }),
  );
}

/**
 * `VACUUM INTO` writes a transactionally consistent copy of the live database
 * in one read transaction, so a backup taken mid-import contains either all or
 * none of that commit (US-09-03 AC-2). Uploads are added from DATA_DIR/uploads.
 */
export class SqliteBackupArchiver implements BackupArchiver {
  constructor(
    private readonly db: Db,
    private readonly dataDir: string,
    private readonly clock: Clock,
  ) {}

  async create(): Promise<{ bytes: Uint8Array; files: number }> {
    const work = await mkdtemp(path.join(tmpdir(), 'hrm-backup-'));
    try {
      const snapshot = path.join(work, `${randomUUID()}.db`);
      await this.db.$executeRawUnsafe(`VACUUM INTO '${snapshot.replaceAll("'", "''")}'`);
      const uploads = await listFiles(path.resolve(this.dataDir, 'uploads'), 'uploads');
      const entries = [{ name: BACKUP_DB_NAME, bytes: new Uint8Array(await readFile(snapshot)) }, ...uploads];
      return { bytes: writeZip(entries, this.clock.now()), files: uploads.length };
    } finally {
      await rm(work, { recursive: true, force: true });
    }
  }
}
