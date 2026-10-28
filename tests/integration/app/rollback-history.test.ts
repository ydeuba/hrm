import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import * as XLSX from 'xlsx';
import { useTestEnvironment } from '../../helpers/test-env';
import type { TestDb } from '../../helpers/test-db';
import { getContainer } from '@/infrastructure/container';
import { seedReferenceData } from '@/infrastructure/db/seed-reference';
import { POST as login } from '@/app/api/v1/auth/login/route';
import { GET as list } from '@/app/api/v1/imports/route';
import { POST as rollback } from '@/app/api/v1/imports/[id]/rollback/route';
import { GET as download } from '@/app/api/v1/imports/[id]/file/route';

const BASE = 'http://localhost:3000';
const SAMPLE = new Uint8Array(readFileSync(path.resolve(__dirname, '../../fixtures/kpi-master-sheet.xlsx')));
let t: TestDb;
let cookie = '';
let actorId = '';

beforeAll(async () => {
  t = await useTestEnvironment();
  const { useCases, db } = await getContainer();
  await seedReferenceData(db);
  await useCases.createInitialAdmin.execute({ email: 'hr@x.com', password: 'rollback-test-pass' });
  actorId = (await db.adminUser.findFirstOrThrow()).id;
  const res = await login(new NextRequest(`${BASE}/api/v1/auth/login`, { method: 'POST', headers: { origin: BASE }, body: JSON.stringify({ email: 'hr@x.com', password: 'rollback-test-pass' }) }));
  cookie = /hrm_session=[^;]+/.exec(res.headers.get('set-cookie') ?? '')?.[0] ?? '';
});
afterAll(async () => {
  await (await getContainer()).close();
  await t.cleanup();
});

async function importBytes(name: string, bytes: Uint8Array): Promise<string> {
  const { useCases } = await getContainer();
  const p = await useCases.previewImport.execute({ fileName: name, bytes, actorId });
  if (!p.ok) throw new Error('preview');
  const c = await useCases.commitImport.execute({ batchId: p.value.batchId, actorId, merges: [] });
  if (!c.ok) throw new Error(`commit ${c.error}`);
  return p.value.batchId;
}

/** Sheet B: changes one score, adds one person, adds one sprint, moves one person to a new team. */
function sheetB(): Uint8Array {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['Resources', 'Teams', 'Designation', 'S138', 'S139'],
      ['Niba Tandukar', 'DevOps', 'Team Lead', 1.0, 9.5],
      ['Ram Chandra Dahal', 'Platform Team', 'SSE', 'RUN', 8],
      ['Brand New Person', 'DevOps', 'SE', null, 7.25],
    ]),
    'Compile Sheet',
  );
  return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer);
}

async function snapshot() {
  const { db } = await getContainer();
  const [employees, teams, sprints, scores, aliases] = await Promise.all([
    db.employee.findMany({ orderBy: { id: 'asc' }, select: { id: true, displayName: true, teamId: true, designationId: true } }),
    db.team.findMany({ orderBy: { id: 'asc' }, select: { id: true, name: true } }),
    db.sprint.findMany({ orderBy: { id: 'asc' }, select: { id: true, code: true } }),
    db.score.findMany({ orderBy: [{ employeeId: 'asc' }, { sprintId: 'asc' }], select: { employeeId: true, sprintId: true, status: true, valueCenti: true, sourceBatchId: true } }),
    db.employeeAlias.findMany({ orderBy: { id: 'asc' }, select: { id: true, normalisedName: true } }),
  ]);
  return { employees, teams, sprints, scores, aliases };
}

const post = (url: string) => new NextRequest(`${BASE}${url}`, { method: 'POST', headers: { origin: BASE, cookie } });
const params = (id: string) => ({ params: Promise.resolve({ id }) });

describe('rollback (E-02-08) and history (E-02-09)', () => {
  let batchA = '';
  let batchB = '';
  let afterA: Awaited<ReturnType<typeof snapshot>>;

  it('AC-4 (E-02-08): import A → import B → roll back B restores the state after A exactly', async () => {
    batchA = await importBytes('A.xlsx', SAMPLE);
    afterA = await snapshot();
    batchB = await importBytes('B.xlsx', sheetB());
    const afterB = await snapshot();
    expect(afterB.employees.length).toBe(afterA.employees.length + 1);
    expect(afterB.sprints.length).toBe(afterA.sprints.length + 1);

    const hist = await (await list(new NextRequest(`${BASE}/api/v1/imports`, { headers: { cookie } }))).json();
    expect(hist.items.map((i: { id: string; canRollback: boolean }) => [i.id, i.canRollback])).toEqual([[batchB, true], [batchA, false]]);

    const notLatest = await rollback(post(`/api/v1/imports/${batchA}/rollback`), params(batchA));
    expect([notLatest.status, (await notLatest.json()).error.code]).toEqual([409, 'NOT_LATEST']);

    const res = await rollback(post(`/api/v1/imports/${batchB}/rollback`), params(batchB));
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe('ROLLED_BACK');
    expect(await snapshot()).toEqual(afterA);
    const { db } = await getContainer();
    expect(await db.auditEvent.count({ where: { action: 'IMPORT_ROLLBACK', entityId: batchB } })).toBe(1);
  });

  it('AC-2 (E-02-08): a later score change blocks rollback; a settings change does not', async () => {
    const { db } = await getContainer();
    const batchC = await importBytes('C.xlsx', sheetB());
    await db.systemState.update({ where: { id: 1 }, data: { settingsRevision: { increment: 1 } } });
    const hist = await (await list(new NextRequest(`${BASE}/api/v1/imports`, { headers: { cookie } }))).json();
    expect(hist.items[0]).toMatchObject({ id: batchC, canRollback: true });
    await db.systemState.update({ where: { id: 1 }, data: { scoreRevision: { increment: 1 } } });
    const res = await rollback(post(`/api/v1/imports/${batchC}/rollback`), params(batchC));
    expect([res.status, (await res.json()).error.code]).toEqual([409, 'CONFLICT_LATER_CHANGES']);
    const missing = await rollback(post('/api/v1/imports/nope/rollback'), params('nope'));
    expect(missing.status).toBe(404);
  });

  it('AC-2 (E-02-09): downloads the exact original bytes; removed originals answer 410', async () => {
    const res = await download(new NextRequest(`${BASE}/api/v1/imports/${batchA}/file`, { headers: { cookie } }), params(batchA));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-disposition')).toContain("filename*=UTF-8''A.xlsx");
    const body = Buffer.from(await res.arrayBuffer());
    expect(body.length).toBe(SAMPLE.length);
    expect(body.equals(Buffer.from(SAMPLE))).toBe(true);
    const { db } = await getContainer();
    await db.importBatch.update({ where: { id: batchB }, data: { fileKey: null } });
    const gone = await download(new NextRequest(`${BASE}/api/v1/imports/${batchB}/file`, { headers: { cookie } }), params(batchB));
    expect(gone.status).toBe(410);
    expect((await download(new NextRequest(`${BASE}/api/v1/imports/nope/file`, { headers: { cookie } }), params('nope'))).status).toBe(404);
    const hist = await (await list(new NextRequest(`${BASE}/api/v1/imports?limit=2`, { headers: { cookie } }))).json();
    expect(hist.items).toHaveLength(2);
    expect(hist.nextCursor).not.toBeNull();
    const page2 = await (await list(new NextRequest(`${BASE}/api/v1/imports?limit=2&cursor=${hist.nextCursor}`, { headers: { cookie } }))).json();
    expect(page2.items[0].id).not.toBe(hist.items[1].id);
  });
});
