import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { useTestEnvironment } from '../../helpers/test-env';
import type { TestDb } from '../../helpers/test-db';
import { getContainer } from '@/infrastructure/container';
import { seedReferenceData } from '@/infrastructure/db/seed-reference';
import { POST as login } from '@/app/api/v1/auth/login/route';
import { GET as listSprints } from '@/app/api/v1/sprints/route';
import { PATCH as patchSprint } from '@/app/api/v1/sprints/[code]/route';
import { GET as dataset } from '@/app/api/v1/kpi/dataset/route';

const BASE = 'http://localhost:3000';
let t: TestDb;
let cookie = '';
let batchId = '';

beforeAll(async () => {
  t = await useTestEnvironment();
  const { useCases, db } = await getContainer();
  await seedReferenceData(db);
  await useCases.createInitialAdmin.execute({ email: 'hr@x.com', password: 'sprint-test-pass' });
  const actorId = (await db.adminUser.findFirstOrThrow()).id;
  const bytes = new Uint8Array(readFileSync(path.resolve(__dirname, '../../fixtures/kpi-master-sheet.xlsx')));
  const p = await useCases.previewImport.execute({ fileName: 'kpi.xlsx', bytes, actorId });
  if (!p.ok) throw new Error('preview');
  batchId = p.value.batchId;
  await useCases.commitImport.execute({ batchId, actorId, merges: [] });
  const res = await login(new NextRequest(`${BASE}/api/v1/auth/login`, { method: 'POST', headers: { origin: BASE }, body: JSON.stringify({ email: 'hr@x.com', password: 'sprint-test-pass' }) }));
  cookie = /hrm_session=[^;]+/.exec(res.headers.get('set-cookie') ?? '')?.[0] ?? '';
});
afterAll(async () => {
  await (await getContainer()).close();
  await t.cleanup();
});

const req = (url: string, method = 'GET', body?: unknown) =>
  new NextRequest(`${BASE}${url}`, { method, headers: { origin: BASE, cookie, 'content-type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
const ctx = (code: string) => ({ params: Promise.resolve({ code }) });

describe('sprint dates (E-03-07)', () => {
  it('lists sprints with participants and no dates initially', async () => {
    const list = await (await listSprints(req('/api/v1/sprints'))).json();
    expect(list).toHaveLength(17);
    expect(list.at(-1)).toMatchObject({ code: 'S138', startDate: null, endDate: null, label: 'S138' });
    expect(list.at(-1).participants).toBeGreaterThan(40);
  });

  it('AC-1: sets, validates and clears dates; audited; rollback stays possible', async () => {
    const bad = await patchSprint(req('/api/v1/sprints/S138', 'PATCH', { startDate: '2026-10-17', endDate: '2026-10-06' }), ctx('S138'));
    expect(bad.status).toBe(400);
    expect((await bad.json()).error.details[0].path).toBe('endDate');
    const res = await patchSprint(req('/api/v1/sprints/s138', 'PATCH', { startDate: '2026-10-06', endDate: '2026-10-17' }), ctx('s138'));
    expect(await res.json()).toMatchObject({ code: 'S138', startDate: '2026-10-06', endDate: '2026-10-17', label: 'S138 · 06 Oct – 17 Oct 2026' });
    expect((await patchSprint(req('/api/v1/sprints/S999', 'PATCH', { startDate: null, endDate: null }), ctx('S999'))).status).toBe(404);
    const { db, useCases } = await getContainer();
    const audit = await db.auditEvent.findFirstOrThrow({ where: { action: 'SPRINT_UPDATE' } });
    expect(audit.after).toEqual({ startDate: '2026-10-06', endDate: '2026-10-17' });
    expect((await useCases.listImports.execute({ limit: 5 })).items.find((i) => i.id === batchId)?.canRollback).toBe(true);
  });

  it('AC-2: the dataset carries tooltip labels for dated sprints only, and refreshes after a change', async () => {
    const ds = await (await dataset(req('/api/v1/kpi/dataset'))).json();
    expect(ds.sprintLabels).toEqual({ S138: 'S138 · 06 Oct – 17 Oct 2026' });
    await patchSprint(req('/api/v1/sprints/S138', 'PATCH', { startDate: null, endDate: null }), ctx('S138'));
    expect((await (await dataset(req('/api/v1/kpi/dataset'))).json()).sprintLabels).toEqual({});
    const { useCases, db } = await getContainer();
    const niba = await db.employee.findFirstOrThrow({ where: { displayName: 'Niba Tandukar' } });
    const profile = await useCases.getEngineerProfile.execute({ id: niba.id });
    expect(profile.ok && profile.value.sprintLabels).toEqual({});
  });
});
