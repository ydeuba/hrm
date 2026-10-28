import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { useTestEnvironment } from '../../helpers/test-env';
import type { TestDb } from '../../helpers/test-db';
import { getContainer } from '@/infrastructure/container';
import { seedReferenceData } from '@/infrastructure/db/seed-reference';

const FIXTURE = path.resolve(__dirname, '../../fixtures/kpi-master-sheet.xlsx');
const DAY = 86_400_000;
let t: TestDb;
let actorId = '';

/** Same content, different bytes (and so a different hash/key). */
function rewritten(): Uint8Array {
  const wb = XLSX.read(readFileSync(FIXTURE), { type: 'buffer' });
  return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer);
}

async function upload(bytes: Uint8Array): Promise<string> {
  const { useCases } = await getContainer();
  const p = await useCases.previewImport.execute({ fileName: 'kpi.xlsx', bytes, actorId });
  if (!p.ok) throw new Error('preview');
  return p.value.batchId;
}

async function age(batchId: string, days: number) {
  const { db } = await getContainer();
  await db.importBatch.update({ where: { id: batchId }, data: { createdAt: new Date(Date.now() - days * DAY) } });
}

beforeAll(async () => {
  t = await useTestEnvironment();
  const { useCases, db } = await getContainer();
  await seedReferenceData(db);
  await useCases.createInitialAdmin.execute({ email: 'hr@x.com', password: 'retention-test-pass' });
  actorId = (await db.adminUser.findFirstOrThrow()).id;
});
afterAll(async () => {
  await (await getContainer()).close();
  await t.cleanup();
});

describe('upload retention purge (E-09-05)', () => {
  it('AC-1: the next upload deletes originals older than uploadRetentionDays and keeps their summaries', async () => {
    const { db, useCases } = await getContainer();
    const oldId = await upload(new Uint8Array(readFileSync(FIXTURE)));
    await useCases.commitImport.execute({ batchId: oldId, actorId, merges: [] });
    const oldKey = (await db.importBatch.findUniqueOrThrow({ where: { id: oldId } })).fileKey ?? '';
    await age(oldId, 89);
    await upload(rewritten());
    expect((await db.importBatch.findUniqueOrThrow({ where: { id: oldId } })).fileKey).toBe(oldKey); // 89 days: kept

    await age(oldId, 91);
    const newId = await upload(rewritten());
    const old = await db.importBatch.findUniqueOrThrow({ where: { id: oldId } });
    expect(old.fileKey).toBeNull();
    expect(old.summary).toBeTruthy();
    expect(existsSync(path.join(t.dir, oldKey))).toBe(false);
    expect((await db.importBatch.findUniqueOrThrow({ where: { id: newId } })).fileKey).not.toBeNull();

    // AC-2: history explains why the download is unavailable.
    const list = await useCases.listImports.execute({ limit: 10 });
    expect(list.items.find((i) => i.id === oldId)).toMatchObject({ hasOriginal: false, originalRemovedReason: 'Original deleted after the 90-day retention period' });
    expect(list.items.find((i) => i.id === newId)).toMatchObject({ hasOriginal: true, originalRemovedReason: null });
  });

  it('keeps a file still referenced by a newer batch with the same content hash', async () => {
    const { db } = await getContainer();
    const bytes = rewritten();
    const a = await upload(bytes);
    const key = (await db.importBatch.findUniqueOrThrow({ where: { id: a } })).fileKey ?? '';
    await age(a, 120);
    const b = await upload(bytes);
    expect((await db.importBatch.findUniqueOrThrow({ where: { id: a } })).fileKey).toBeNull();
    expect((await db.importBatch.findUniqueOrThrow({ where: { id: b } })).fileKey).toBe(key);
    expect(existsSync(path.join(t.dir, key))).toBe(true);
  });
});
