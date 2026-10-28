import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { useTestEnvironment } from '../../helpers/test-env';
import type { TestDb } from '../../helpers/test-db';
import { getContainer } from '@/infrastructure/container';
import { seedReferenceData } from '@/infrastructure/db/seed-reference';
import { DEFAULT_KPI_SETTINGS } from '@/domain/settings/defaults';
import { POST as login } from '@/app/api/v1/auth/login/route';
import { GET as getSettings, PUT as putSettings } from '@/app/api/v1/settings/route';
import { POST as resetSettings } from '@/app/api/v1/settings/reset/route';
import { GET as dataset } from '@/app/api/v1/kpi/dataset/route';

const BASE = 'http://localhost:3000';
let t: TestDb;
let cookie = '';
let batchId = '';

beforeAll(async () => {
  t = await useTestEnvironment();
  const { useCases, db } = await getContainer();
  await seedReferenceData(db);
  await useCases.createInitialAdmin.execute({ email: 'hr@x.com', password: 'settings-test-pass' });
  const actorId = (await db.adminUser.findFirstOrThrow()).id;
  const bytes = new Uint8Array(readFileSync(path.resolve(__dirname, '../../fixtures/kpi-master-sheet.xlsx')));
  const p = await useCases.previewImport.execute({ fileName: 'kpi.xlsx', bytes, actorId });
  if (!p.ok) throw new Error('preview');
  batchId = p.value.batchId;
  await useCases.commitImport.execute({ batchId, actorId, merges: [] });
  const res = await login(new NextRequest(`${BASE}/api/v1/auth/login`, { method: 'POST', headers: { origin: BASE }, body: JSON.stringify({ email: 'hr@x.com', password: 'settings-test-pass' }) }));
  cookie = /hrm_session=[^;]+/.exec(res.headers.get('set-cookie') ?? '')?.[0] ?? '';
});
afterAll(async () => {
  await (await getContainer()).close();
  await t.cleanup();
});

const req = (url: string, method = 'GET', body?: unknown, extra: Record<string, string> = {}) =>
  new NextRequest(`${BASE}${url}`, { method, headers: { origin: BASE, cookie, 'content-type': 'application/json', ...extra }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });

describe('settings (E-08)', () => {
  it('E-08-01 AC-1: returns defaults merged with stored values', async () => {
    expect(await (await getSettings(req('/api/v1/settings'))).json()).toEqual(DEFAULT_KPI_SETTINGS);
  });

  it('E-08-01 AC-2: rejects invalid values with field errors', async () => {
    const badBands = { ...DEFAULT_KPI_SETTINGS, bands: DEFAULT_KPI_SETTINGS.bands.map((b) => (b.key === 'exc' ? { ...b, min: 9 } : b)) };
    const r1 = await putSettings(req('/api/v1/settings', 'PUT', badBands));
    expect(r1.status).toBe(400);
    expect((await r1.json()).error.details).toEqual([{ path: 'bands', message: 'Band minimums must strictly descend' }]);
    const r2 = await putSettings(req('/api/v1/settings', 'PUT', { ...DEFAULT_KPI_SETTINGS, lastNWindow: 25, dataCheckTolerance: -1 }));
    const paths = (await r2.json()).error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(expect.arrayContaining(['lastNWindow', 'dataCheckTolerance']));
    const r3 = await putSettings(req('/api/v1/settings', 'PUT', { ...DEFAULT_KPI_SETTINGS, lastNWindow: 3, lastNMinSprints: 4 }));
    expect((await r3.json()).error.details).toEqual([{ path: 'lastNMinSprints', message: 'Must not exceed the last-N window size' }]);
  });

  it('E-08-01 AC-3 + E-08-04: a valid save is audited, changes the ETag and recomputes bands without re-import; rollback stays possible', async () => {
    const before = await dataset(req('/api/v1/kpi/dataset'));
    const etag = before.headers.get('etag') ?? '';
    const stricter = { ...DEFAULT_KPI_SETTINGS, bands: DEFAULT_KPI_SETTINGS.bands.map((b) => (b.key === 'out' ? { ...b, min: 9 } : b)) };
    const res = await putSettings(req('/api/v1/settings', 'PUT', stricter));
    expect(res.status).toBe(200);
    const after = await dataset(req('/api/v1/kpi/dataset', 'GET', undefined, { 'if-none-match': etag }));
    expect(after.status).toBe(200);
    expect((await after.json()).settings.bands[0].min).toBe(9);
    const { db, useCases } = await getContainer();
    const audit = await db.auditEvent.findFirstOrThrow({ where: { action: 'SETTINGS_UPDATE' }, orderBy: { at: 'desc' } });
    expect((audit.after as { bands: { min: number }[] }).bands[0]?.min).toBe(9);
    const imports = await useCases.listImports.execute({ limit: 5 });
    expect(imports.items.find((i) => i.id === batchId)?.canRollback).toBe(true);
  });

  it('E-08-05: reset restores defaults and is audited', async () => {
    const res = await resetSettings(req('/api/v1/settings/reset', 'POST'));
    expect(await res.json()).toEqual(DEFAULT_KPI_SETTINGS);
    const { db } = await getContainer();
    expect(await db.auditEvent.count({ where: { action: 'SETTINGS_UPDATE' } })).toBe(2);
  });
});
