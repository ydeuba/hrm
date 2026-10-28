import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import * as XLSX from 'xlsx';
import expected from '../../fixtures/expected-workbook.json';
import { useTestEnvironment } from '../../helpers/test-env';
import type { TestDb } from '../../helpers/test-db';
import { getContainer } from '@/infrastructure/container';
import { seedReferenceData } from '@/infrastructure/db/seed-reference';
import { PrismaImportCommitter } from '@/infrastructure/db/repositories/prisma-import-committer';
import type { ImportDiff } from '@/domain/import/diff';
import type { ParsedMasterSheet } from '@/domain/import/master-sheet';
import { POST as login } from '@/app/api/v1/auth/login/route';
import { GET as listImports, POST as upload } from '@/app/api/v1/imports/route';
import { DELETE as discard, GET as getImport } from '@/app/api/v1/imports/[id]/route';
import { POST as commit } from '@/app/api/v1/imports/[id]/commit/route';

const BASE = 'http://localhost:3000';
const sample = readFileSync(path.resolve(__dirname, '../../fixtures/kpi-master-sheet.xlsx'));
const RUN_CELLS = expected.employees.reduce((a, e) => a + Object.values(e.cells).filter((v) => v === 'RUN').length, 0);
let t: TestDb;
let cookie = '';

beforeAll(async () => {
  t = await useTestEnvironment();
  const { useCases, db } = await getContainer();
  await seedReferenceData(db);
  await useCases.createInitialAdmin.execute({ email: 'hr@x.com', password: 'import-flow-password' });
  const res = await login(new NextRequest(`${BASE}/api/v1/auth/login`, { method: 'POST', headers: { origin: BASE }, body: JSON.stringify({ email: 'hr@x.com', password: 'import-flow-password' }) }));
  cookie = /hrm_session=[^;]+/.exec(res.headers.get('set-cookie') ?? '')?.[0] ?? '';
});
afterAll(async () => {
  await (await getContainer()).close();
  await t.cleanup();
});

const headers = () => ({ origin: BASE, cookie });
const params = (id: string) => ({ params: Promise.resolve({ id }) });

async function uploadFile(name: string, bytes: Uint8Array) {
  const form = new FormData();
  form.append('file', new File([bytes as BlobPart], name));
  const res = await upload(new NextRequest(`${BASE}/api/v1/imports`, { method: 'POST', body: form, headers: headers() }));
  return { status: res.status, body: await res.json() };
}

async function commitBatch(id: string, merges: unknown[] = []) {
  const res = await commit(new NextRequest(`${BASE}/api/v1/imports/${id}/commit`, { method: 'POST', headers: headers(), body: JSON.stringify({ merges }) }), params(id));
  return { status: res.status, body: await res.json() };
}

function workbook(rows: (string | number | null)[][]): Uint8Array {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Resources', 'Teams', 'Designation', 'S200'], ...rows]), 'Compile Sheet');
  return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer);
}

let firstBatchId = '';

describe('preview (E-02-05)', () => {
  it('AC-1: previewing the master sheet reports sheet, sprints, counts and tabs data', async () => {
    const { status, body } = await uploadFile('KPI Master Sheet (2).xlsx', sample);
    expect(status).toBe(201);
    firstBatchId = body.id;
    expect(body).toMatchObject({ status: 'PREVIEW', sheetName: 'Compile Sheet ', headerRow: 1, canCommit: true, sameAsBatch: null });
    expect(body.sprints).toHaveLength(17);
    expect(body.emptySprints).toEqual(['S139', 'S140', 'S141']);
    expect(body.summary).toEqual({
      rows: 49, newEmployees: 49, matchedEmployees: 0, attributeChanges: 0, newSprints: 17,
      scoresAdded: 560 + RUN_CELLS, scoresChanged: 0, scoresUnchanged: 0, notInFile: 0, errors: 0, warnings: 1,
    });
    expect(body.newEmployees).toHaveLength(49);
    expect(body.newTeams).toHaveLength(8);
    expect(body.newDesignations).toEqual([]);
    expect(body.issues).toEqual([expect.objectContaining({ code: 'PRECISION_ROUNDED', row: 44 })]);
    expect(Date.parse(body.expiresAt) - Date.parse(body.createdAt)).toBe(30 * 60_000);
  });

  it('nothing outside the preview batch is written', async () => {
    const { db } = await getContainer();
    expect(await db.employee.count()).toBe(0);
    expect(await db.score.count()).toBe(0);
    expect((await db.systemState.findUniqueOrThrow({ where: { id: 1 } })).scoreRevision).toBe(0);
  });

  it('GET returns the same preview; the history lists it', async () => {
    const res = await getImport(new NextRequest(`${BASE}/api/v1/imports/${firstBatchId}`, { headers: headers() }), params(firstBatchId));
    expect((await res.json()).summary.newEmployees).toBe(49);
    const list = await (await listImports(new NextRequest(`${BASE}/api/v1/imports`, { headers: headers() }))).json();
    expect(list.items[0]).toMatchObject({ id: firstBatchId, status: 'PREVIEW', sprints: { from: 'S122', to: 'S138' }, hasOriginal: true });
  });
});

describe('commit (E-02-07)', () => {
  it('AC-1/AC-5: writes everything in one transaction with a journal and audit row', async () => {
    const { status, body } = await commitBatch(firstBatchId);
    expect(status).toBe(200);
    expect(body.status).toBe('COMMITTED');
    const { db } = await getContainer();
    expect(await db.employee.count()).toBe(49);
    expect(await db.team.count()).toBe(8);
    expect(await db.designation.count()).toBe(4);
    expect(await db.sprint.count()).toBe(17);
    expect(await db.score.count({ where: { status: 'SCORED' } })).toBe(560);
    expect(await db.score.count({ where: { status: 'RUN' } })).toBe(RUN_CELLS);
    const batch = await db.importBatch.findUniqueOrThrow({ where: { id: firstBatchId } });
    expect([batch.status, batch.commitRevision, batch.parsed]).toEqual(['COMMITTED', 1, null]);
    expect((await db.systemState.findUniqueOrThrow({ where: { id: 1 } })).scoreRevision).toBe(1);
    const journal = await db.importChange.count({ where: { batchId: firstBatchId } });
    expect(journal).toBe(8 * 2 + 17 + 49 * 2 + 560 + RUN_CELLS);
    expect(await db.auditEvent.count({ where: { action: 'IMPORT_COMMIT', entityId: firstBatchId } })).toBe(1);
    const bishal = await db.employee.findFirstOrThrow({ where: { normalisedName: 'bishal joshi' }, select: { scores: { where: { sprint: { code: 'S122' } } } } });
    expect(bishal.scores[0]?.valueCenti).toBe(598);
  });

  it('a committed batch cannot be committed again', async () => {
    expect((await commitBatch(firstBatchId)).status).toBe(409);
  });

  it('re-uploading the same file previews as no changes and notes the earlier import', async () => {
    const { body } = await uploadFile('KPI Master Sheet (2).xlsx', sample);
    expect(body.summary).toMatchObject({ newEmployees: 0, matchedEmployees: 49, scoresAdded: 0, scoresChanged: 0, scoresUnchanged: 560 + RUN_CELLS, newSprints: 0 });
    expect(body.sameAsBatch?.id).toBe(firstBatchId);
  });

  it('AC-2: a preview taken before another change returns 409 and writes nothing', async () => {
    const { body } = await uploadFile('new.xlsx', workbook([['Fresh Person', 'DevOps', 'SE', 9]]));
    const { db } = await getContainer();
    await db.systemState.update({ where: { id: 1 }, data: { scoreRevision: { increment: 1 } } });
    const res = await commitBatch(body.id);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT_STALE_PREVIEW');
    expect(await db.employee.count({ where: { normalisedName: 'fresh person' } })).toBe(0);
  });

  it('AC-3: a failure mid-transaction leaves the database exactly as before', async () => {
    const { db } = await getContainer();
    const counts = async () => Promise.all([db.employee.count(), db.score.count(), db.importChange.count(), db.team.count(), db.sprint.count()]);
    const before = await counts();
    const revision = (await db.systemState.findUniqueOrThrow({ where: { id: 1 } })).scoreRevision;
    const sheet: ParsedMasterSheet = {
      sheetName: 'x', headerRow: 1, sprints: ['S900'], emptySprints: [],
      rows: [{ rowNumber: 2, name: 'Rollback Probe', normalisedName: 'rollback probe', team: 'Probe Team', designation: 'SE', code: null, cells: [{ kind: 'scored', centi: 500 }], sheetTotal: null, sheetAverage: null }],
    };
    const row = sheet.rows[0];
    if (!row) throw new Error('fixture');
    const diff = {
      plans: [{
        row, employeeId: null, team: { kind: 'new', name: 'Probe Team' }, designation: { kind: 'existing', id: 'missing-designation-id', name: 'SE' },
        updateTeam: false, updateDesignation: false, addAlias: false, scoreChanges: [{ sprint: 'S900', from: null, to: { kind: 'scored', centi: 500 } }], unchangedScores: 0,
      }],
      newTeams: ['Probe Team'], newDesignations: [], newSprints: ['S900'], notInFile: [], nearDuplicates: [], issues: [],
      summary: { rows: 1, newEmployees: 1, matchedEmployees: 0, attributeChanges: 0, newSprints: 1, scoresAdded: 1, scoresChanged: 0, scoresUnchanged: 0, notInFile: 0 },
    } as unknown as ImportDiff;
    const batch = await db.importBatch.findFirstOrThrow({ where: { status: 'PREVIEW' } });
    await expect(new PrismaImportCommitter(db).commit({ batchId: batch.id, baseRevision: revision, sheet, diff, actorId: batch.actorId, now: new Date() })).rejects.toThrow();
    expect(await counts()).toEqual(before);
    expect((await db.systemState.findUniqueOrThrow({ where: { id: 1 } })).scoreRevision).toBe(revision);
  });
});

describe('preview lifecycle', () => {
  it('AC-4 (E-02-05): discard → 204; a discarded preview cannot be committed', async () => {
    const { body } = await uploadFile('d.xlsx', workbook([['Discard Me', 'DevOps', 'SE', 7]]));
    const res = await discard(new NextRequest(`${BASE}/api/v1/imports/${body.id}`, { method: 'DELETE', headers: headers() }), params(body.id));
    expect(res.status).toBe(204);
    expect((await commitBatch(body.id)).status).toBe(409);
    const again = await discard(new NextRequest(`${BASE}/api/v1/imports/${body.id}`, { method: 'DELETE', headers: headers() }), params(body.id));
    expect(again.status).toBe(409);
  });

  it('an expired preview answers 410', async () => {
    const { body } = await uploadFile('e.xlsx', workbook([['Late Person', 'DevOps', 'SE', 7]]));
    const { db } = await getContainer();
    await db.importBatch.update({ where: { id: body.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await commitBatch(body.id)).status).toBe(410);
    const detail = await (await getImport(new NextRequest(`${BASE}/api/v1/imports/${body.id}`, { headers: headers() }), params(body.id))).json();
    expect(detail.status).toBe('EXPIRED');
  });

  it('AC-3 (E-02-05): a sheet with errors previews with canCommit=false and commit is refused', async () => {
    const { body } = await uploadFile('bad.xlsx', workbook([['Err Person', 'DevOps', 'SE', 'abc'], ['Ok Person', 'DevOps', 'SE', 8]]));
    expect(body.canCommit).toBe(false);
    expect(body.summary.errors).toBe(1);
    const res = await commitBatch(body.id);
    expect([res.status, res.body.error.code]).toEqual([422, 'IMPORT_HAS_ERRORS']);
  });

  it('AC-2 (E-02-05): a near-duplicate can be confirmed as the same person (alias added)', async () => {
    const { body } = await uploadFile('n.xlsx', workbook([['Surya Joshee', 'Blaze Warrior', 'ASE', 9]]));
    const nd = body.nearDuplicates.find((n: { fileName: string }) => n.fileName === 'Surya Joshee');
    expect(nd?.existingName).toBe('Surya joshi');
    expect((await commitBatch(body.id, [{ fileName: 'Surya Joshee', existingEmployeeId: 'not-offered' }])).status).toBe(400);
    const ok = await commitBatch(body.id, [{ fileName: 'Surya Joshee', existingEmployeeId: nd.existingEmployeeId }]);
    expect(ok.status).toBe(200);
    const { db } = await getContainer();
    expect(await db.employeeAlias.count({ where: { normalisedName: 'surya joshee', employeeId: nd.existingEmployeeId, source: 'MERGE' } })).toBe(1);
    expect(await db.employee.count({ where: { normalisedName: 'surya joshee' } })).toBe(0);
  });

  it('unknown ids are 404; an unparseable sheet is 400 IMPORT_NO_HEADER', async () => {
    const missing = await getImport(new NextRequest(`${BASE}/api/v1/imports/nope`, { headers: headers() }), params('nope'));
    expect(missing.status).toBe(404);
    expect((await commitBatch('nope')).status).toBe(404);
    const del = await discard(new NextRequest(`${BASE}/api/v1/imports/nope`, { method: 'DELETE', headers: headers() }), params('nope'));
    expect(del.status).toBe(404);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['no', 'header']]), 'X');
    const res = await uploadFile('x.xlsx', new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer));
    expect([res.status, res.body.error.code]).toEqual([400, 'IMPORT_NO_HEADER']);
  });
});
