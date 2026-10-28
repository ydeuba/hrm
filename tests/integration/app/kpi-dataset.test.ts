import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import expected from '../../fixtures/expected-workbook.json';
import { useTestEnvironment } from '../../helpers/test-env';
import type { TestDb } from '../../helpers/test-db';
import { getContainer } from '@/infrastructure/container';
import { seedReferenceData } from '@/infrastructure/db/seed-reference';
import { POST as login } from '@/app/api/v1/auth/login/route';
import { GET as dataset } from '@/app/api/v1/kpi/dataset/route';

const BASE = 'http://localhost:3000';
let t: TestDb;
let cookie = '';

beforeAll(async () => {
  t = await useTestEnvironment();
  const { useCases, db } = await getContainer();
  await seedReferenceData(db);
  await useCases.createInitialAdmin.execute({ email: 'hr@x.com', password: 'dataset-test-password' });
  const admin = await db.adminUser.findFirstOrThrow();
  const bytes = new Uint8Array(readFileSync(path.resolve(__dirname, '../../fixtures/kpi-master-sheet.xlsx')));
  const preview = await useCases.previewImport.execute({ fileName: 'kpi.xlsx', bytes, actorId: admin.id });
  if (!preview.ok) throw new Error('preview failed');
  const committed = await useCases.commitImport.execute({ batchId: preview.value.batchId, actorId: admin.id, merges: [] });
  if (!committed.ok) throw new Error(`commit failed: ${committed.error}`);
  const res = await login(new NextRequest(`${BASE}/api/v1/auth/login`, { method: 'POST', headers: { origin: BASE }, body: JSON.stringify({ email: 'hr@x.com', password: 'dataset-test-password' }) }));
  cookie = /hrm_session=[^;]+/.exec(res.headers.get('set-cookie') ?? '')?.[0] ?? '';
});
afterAll(async () => {
  await (await getContainer()).close();
  await t.cleanup();
});

const get = (qs = '', extra: Record<string, string> = {}) => dataset(new NextRequest(`${BASE}/api/v1/kpi/dataset${qs}`, { headers: { cookie, ...extra } }));

describe('GET /api/v1/kpi/dataset (E-04-05)', () => {
  it('AC-1: compact cells, ordered sprints, server ranks matching the sheet, metadata', async () => {
    const res = await get();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sprints).toEqual(expected.sprints);
    expect(body.engineers).toHaveLength(49);
    expect(body.activeCount).toBe(49);
    expect(body.lastImport).toMatchObject({ fileName: 'kpi.xlsx' });
    expect(body.dataCheck).toBeNull();
    expect(body.settings.rankingScope).toBe('overall');
    const niba = body.engineers.find((e: { name: string }) => e.name === 'Niba Tandukar');
    expect(niba.cells.slice(0, 8)).toEqual([null, null, null, null, null, null, null, 8.33]);
    const jeevan = body.engineers.find((e: { name: string }) => e.name === 'Jeevan Joshi');
    expect(jeevan.cells[0]).toBe('R');
    const mismatched = expected.employees.filter((e) => body.engineers.find((x: { name: string }) => x.name === e.name.replace(/\s+/g, ' '))?.overallRank !== e.overallRank);
    expect(mismatched.map((e) => e.name)).toEqual([]);
  });

  it('AC-2: answers 304 for a matching If-None-Match and a new ETag after data changes', async () => {
    const first = await get();
    const etag = first.headers.get('etag') ?? '';
    expect(etag).toMatch(/^"\d+\.\d+-/);
    expect((await get('', { 'if-none-match': etag })).status).toBe(304);
    const { db } = await getContainer();
    await db.systemState.update({ where: { id: 1 }, data: { settingsRevision: { increment: 1 } } });
    const after = await get('', { 'if-none-match': etag });
    expect(after.status).toBe(200);
    expect(after.headers.get('etag')).not.toBe(etag);
  });

  it('AC-4: excludes inactive employees by default and ranks only active ones', async () => {
    const { db } = await getContainer();
    const top = await db.employee.findFirstOrThrow({ where: { normalisedName: 'dilendra thagunna' } });
    await db.employee.update({ where: { id: top.id }, data: { status: 'INACTIVE' } });
    await db.systemState.update({ where: { id: 1 }, data: { scoreRevision: { increment: 1 } } });
    const body = await (await get()).json();
    expect(body.engineers).toHaveLength(48);
    expect(body.engineers.filter((e: { overallRank: number }) => e.overallRank === 1).map((e: { name: string }) => e.name)).toEqual(['Ashika Balami', 'Dipesh Kayastha']);
    const all = await (await get('?includeInactive=true')).json();
    expect(all.engineers).toHaveLength(49);
    expect(all.engineers.find((e: { name: string }) => e.name === 'Dilendra Thagunna')).toMatchObject({ status: 'INACTIVE', overallRank: null });
    await db.employee.update({ where: { id: top.id }, data: { status: 'ACTIVE' } });
    await db.systemState.update({ where: { id: 1 }, data: { scoreRevision: { increment: 1 } } });
  });

  it('supports a sprint range and rejects invalid ranges', async () => {
    const body = await (await get('?from=s130&to=S135')).json();
    expect(body.sprints).toEqual(['S130', 'S131', 'S132', 'S133', 'S134', 'S135']);
    expect(body.allSprints).toHaveLength(17);
    expect(body.engineers[0].cells).toHaveLength(6);
    expect((await get('?from=S135&to=S130')).status).toBe(400);
    expect((await get('?from=S999')).status).toBe(400);
    expect((await get('?from=banana')).status).toBe(400);
  });

  it('reports data-check warnings from the latest committed import', async () => {
    const { db } = await getContainer();
    const batch = await db.importBatch.findFirstOrThrow({ where: { status: 'COMMITTED' } });
    await db.importIssue.create({ data: { batchId: batch.id, severity: 'WARNING', code: 'AVG_MISMATCH', row: 5, column: 'Average', employeeName: 'Niba Tandukar', message: 'x', sheetValue: 9.9, computedValue: 9.53 } });
    await db.systemState.update({ where: { id: 1 }, data: { scoreRevision: { increment: 1 } } });
    const body = await (await get()).json();
    expect(body.dataCheck).toEqual({ batchId: batch.id, items: [{ name: 'Niba Tandukar', kind: 'AVG', sheetValue: 9.9, computedValue: 9.53 }] });
  });
});

