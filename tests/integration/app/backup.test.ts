import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import * as XLSX from 'xlsx';
import { useTestEnvironment } from '../../helpers/test-env';
import type { TestDb } from '../../helpers/test-db';
import { getContainer } from '@/infrastructure/container';
import { seedReferenceData } from '@/infrastructure/db/seed-reference';
import { POST as login } from '@/app/api/v1/auth/login/route';
import { POST as backup } from '@/app/api/v1/backups/route';

const BASE = 'http://localhost:3000';
const TABLES = ['Employee', 'Team', 'Designation', 'Sprint', 'Score', 'ImportBatch', 'ImportChange', 'AuditEvent', 'AdminUser'];
let t: TestDb;
let cookie = '';

beforeAll(async () => {
  t = await useTestEnvironment();
  const { useCases, db } = await getContainer();
  await seedReferenceData(db);
  await useCases.createInitialAdmin.execute({ email: 'hr@x.com', password: 'backup-test-pass' });
  const actorId = (await db.adminUser.findFirstOrThrow()).id;
  const bytes = new Uint8Array(readFileSync(path.resolve(__dirname, '../../fixtures/kpi-master-sheet.xlsx')));
  const p = await useCases.previewImport.execute({ fileName: 'kpi.xlsx', bytes, actorId });
  if (!p.ok) throw new Error('preview');
  await useCases.commitImport.execute({ batchId: p.value.batchId, actorId, merges: [] });
  const res = await login(new NextRequest(`${BASE}/api/v1/auth/login`, { method: 'POST', headers: { origin: BASE }, body: JSON.stringify({ email: 'hr@x.com', password: 'backup-test-pass' }) }));
  cookie = /hrm_session=[^;]+/.exec(res.headers.get('set-cookie') ?? '')?.[0] ?? '';
});
afterAll(async () => {
  await (await getContainer()).close();
  await t.cleanup();
});

async function counts(query: (table: string) => number | Promise<number>) {
  const out: Record<string, number> = {};
  for (const table of TABLES) out[table] = await query(table);
  return out;
}

describe('backup (E-09-03) and restore verification (E-09-04)', () => {
  it('rejects a cross-origin request', async () => {
    const res = await backup(new NextRequest(`${BASE}/api/v1/backups`, { method: 'POST', headers: { origin: 'https://evil.example', cookie } }));
    expect(res.status).toBe(403);
  });

  it('E-09-03 AC-1/3 + E-09-04 AC-2: zip holds a snapshot and uploads; restored row counts equal the source; audited', async () => {
    const { db } = await getContainer();
    const res = await backup(new NextRequest(`${BASE}/api/v1/backups`, { method: 'POST', headers: { origin: BASE, cookie } }));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/zip');
    expect(res.headers.get('content-disposition')).toMatch(/^attachment; filename="hrm-backup_\d{8}-\d{4}\.zip"$/);

    const cfb = XLSX.CFB.read(new Uint8Array(await res.arrayBuffer()), { type: 'array' });
    const names = (cfb.FullPaths as string[]).filter((p) => !p.endsWith('/')).map((p) => p.replace(/^[^/]*\//, ''));
    expect(names).toContain('hrm.db');
    expect(names.filter((n) => /^uploads\/[a-f0-9]{64}\.xlsx$/.test(n))).toHaveLength(1);

    const restoreDir = mkdtempSync(path.join(tmpdir(), 'hrm-restore-'));
    try {
      const file = path.join(restoreDir, 'hrm.db');
      writeFileSync(file, XLSX.CFB.find(cfb, 'hrm.db')?.content as Uint8Array);
      const restored = new Database(file, { readonly: true });
      try {
        const source = await counts(async (table) => Number((await db.$queryRawUnsafe<{ n: bigint }[]>(`SELECT COUNT(*) AS n FROM "${table}"`))[0]?.n ?? 0));
        // The audit row for this backup is written after the snapshot.
        const copy = await counts((table) => (restored.prepare(`SELECT COUNT(*) AS n FROM "${table}"`).get() as { n: number }).n);
        expect({ ...copy, AuditEvent: (copy.AuditEvent ?? 0) + 1 }).toEqual(source);
        expect(copy.Score).toBeGreaterThan(500);
      } finally {
        restored.close();
      }
    } finally {
      rmSync(restoreDir, { recursive: true, force: true });
    }
    const audit = await db.auditEvent.findFirstOrThrow({ where: { action: 'BACKUP_CREATE' } });
    expect(audit.meta).toMatchObject({ uploads: 1 });
  });
});
