import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { useTestEnvironment } from '../../helpers/test-env';
import type { TestDb } from '../../helpers/test-db';
import { getContainer } from '@/infrastructure/container';
import { seedReferenceData } from '@/infrastructure/db/seed-reference';
import { POST as login } from '@/app/api/v1/auth/login/route';
import { DELETE as erase, PATCH as patchEmployee } from '@/app/api/v1/employees/[id]/route';
import { POST as merge } from '@/app/api/v1/employees/[id]/merge/route';
import { PUT as correct } from '@/app/api/v1/employees/[id]/scores/[sprint]/route';

const BASE = 'http://localhost:3000';
let t: TestDb;
let cookie = '';
let batchId = '';

beforeAll(async () => {
  t = await useTestEnvironment();
  const { useCases, db } = await getContainer();
  await seedReferenceData(db);
  await useCases.createInitialAdmin.execute({ email: 'hr@x.com', password: 'data-ops-test-pass' });
  const actorId = (await db.adminUser.findFirstOrThrow()).id;
  const bytes = new Uint8Array(readFileSync(path.resolve(__dirname, '../../fixtures/kpi-master-sheet.xlsx')));
  const p = await useCases.previewImport.execute({ fileName: 'kpi.xlsx', bytes, actorId });
  if (!p.ok) throw new Error('preview');
  batchId = p.value.batchId;
  await useCases.commitImport.execute({ batchId, actorId, merges: [] });
  const res = await login(new NextRequest(`${BASE}/api/v1/auth/login`, { method: 'POST', headers: { origin: BASE }, body: JSON.stringify({ email: 'hr@x.com', password: 'data-ops-test-pass' }) }));
  cookie = /hrm_session=[^;]+/.exec(res.headers.get('set-cookie') ?? '')?.[0] ?? '';
});
afterAll(async () => {
  await (await getContainer()).close();
  await t.cleanup();
});

const req = (url: string, method: string, body: unknown) =>
  new NextRequest(`${BASE}${url}`, { method, headers: { origin: BASE, cookie, 'content-type': 'application/json' }, body: JSON.stringify(body) });
const ctx = <P extends Record<string, string>>(p: P) => ({ params: Promise.resolve(p) });
const employee = async (name: string) => (await getContainer()).db.employee.findFirstOrThrow({ where: { displayName: name }, select: { id: true, teamId: true, designationId: true } });

async function duplicateOf(name: string, sprintCodes: string[], centi: number) {
  const { db } = await getContainer();
  const original = await employee(name);
  const dup = await db.employee.create({
    data: { displayName: `${name}x`, normalisedName: `${name.toLowerCase()}x`, teamId: original.teamId, designationId: original.designationId, aliases: { create: { normalisedName: `${name.toLowerCase()}x`, source: 'CANONICAL' } } },
  });
  const sprints = await db.sprint.findMany({ where: { code: { in: sprintCodes } }, select: { id: true } });
  await db.score.createMany({ data: sprints.map((s) => ({ employeeId: dup.id, sprintId: s.id, status: 'SCORED' as const, valueCenti: centi })) });
  return { original, dup };
}

async function cell(employeeId: string, code: string) {
  const { db } = await getContainer();
  return db.score.findFirst({ where: { employeeId, sprint: { code } }, select: { status: true, valueCenti: true } });
}

describe('merge employees (E-03-04)', () => {
  it('AC-3: merging into yourself is 400 SAME_EMPLOYEE', async () => {
    const a = await employee('Mandip Thapa');
    const res = await merge(req(`/api/v1/employees/${a.id}/merge`, 'POST', { sourceId: a.id, conflictPolicy: 'keepTarget' }), ctx({ id: a.id }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('SAME_EMPLOYEE');
  });

  it('AC-1: keepTarget moves non-conflicting scores and aliases, keeps the target on conflicts, deletes the source; audited, revision bumped', async () => {
    const { db } = await getContainer();
    const mandipScore = await db.score.findFirstOrThrow({ where: { employee: { displayName: 'Mandip Thapa' } }, select: { sprint: { select: { code: true } }, valueCenti: true } });
    const conflict = mandipScore.sprint.code;
    const free = conflict === 'S122' ? 'S123' : 'S122';
    const { original, dup } = await duplicateOf('Mandip Thapa', [conflict, free], 111);
    const rev = (await db.systemState.findFirstOrThrow()).scoreRevision;
    const res = await merge(req(`/api/v1/employees/${original.id}/merge`, 'POST', { sourceId: dup.id, conflictPolicy: 'keepTarget' }), ctx({ id: original.id }));
    expect(res.status).toBe(200);
    expect((await res.json()).aliases).toEqual(expect.arrayContaining(['mandip thapax']));
    expect(await cell(original.id, conflict)).toEqual({ status: 'SCORED', valueCenti: mandipScore.valueCenti });
    expect(await cell(original.id, free)).toEqual({ status: 'SCORED', valueCenti: 111 });
    expect(await db.employee.findUnique({ where: { id: dup.id } })).toBeNull();
    expect((await db.systemState.findFirstOrThrow()).scoreRevision).toBe(rev + 1);
    const audit = await db.auditEvent.findFirstOrThrow({ where: { action: 'EMPLOYEE_MERGE' } });
    expect(audit.meta).toMatchObject({ sourceId: dup.id, policy: 'keepTarget', moved: 1, conflicts: 1, aliasesMoved: 1 });
  });

  it('AC-2: keepSource replaces the target on conflicts', async () => {
    const { original, dup } = await duplicateOf('Susan Mool', ['S138'], 222);
    const res = await merge(req(`/api/v1/employees/${original.id}/merge`, 'POST', { sourceId: dup.id, conflictPolicy: 'keepSource' }), ctx({ id: original.id }));
    expect(res.status).toBe(200);
    expect(await cell(original.id, 'S138')).toEqual({ status: 'SCORED', valueCenti: 222 });
  });

  it('unknown source is 404', async () => {
    const a = await employee('Susan Mool');
    expect((await merge(req(`/api/v1/employees/${a.id}/merge`, 'POST', { sourceId: 'missing', conflictPolicy: 'keepTarget' }), ctx({ id: a.id }))).status).toBe(404);
  });
});

describe('correct a single score (E-03-05)', () => {
  it('AC-1/AC-3: updates the cell, audits before/after with the reason, and blocks rollback of earlier imports', async () => {
    const { db, useCases } = await getContainer();
    const a = await employee('Niba Tandukar');
    const before = await cell(a.id, 'S138');
    const res = await correct(req(`/api/v1/employees/${a.id}/scores/s138`, 'PUT', { value: 8.255, reason: 'Sheet typo confirmed by TL' }), ctx({ id: a.id, sprint: 's138' }));
    expect(res.status).toBe(204);
    expect(await cell(a.id, 'S138')).toEqual({ status: 'SCORED', valueCenti: 826 });
    const audit = await db.auditEvent.findFirstOrThrow({ where: { action: 'SCORE_CORRECT' } });
    expect(audit.before).toEqual({ sprint: 'S138', value: (before?.valueCenti ?? 0) / 100 });
    expect(audit.after).toEqual({ sprint: 'S138', value: 8.26 });
    expect(audit.meta).toEqual({ reason: 'Sheet typo confirmed by TL' });
    const imports = await useCases.listImports.execute({ limit: 5 });
    expect(imports.items.find((i) => i.id === batchId)?.canRollback).toBe(false);

    // Niba's history starts at S129, so S122 has no stored cell yet: the correction creates it.
    expect(await cell(a.id, 'S122')).toBeNull();
    expect((await correct(req(`/api/v1/employees/${a.id}/scores/S122`, 'PUT', { value: 'RUN', reason: 'run duty' }), ctx({ id: a.id, sprint: 'S122' }))).status).toBe(204);
    expect(await cell(a.id, 'S122')).toEqual({ status: 'RUN', valueCenti: null });
  });

  it('AC-2: out-of-range is 422 OUT_OF_RANGE; short reason 400; unknown sprint/employee 404', async () => {
    const a = await employee('Niba Tandukar');
    const r1 = await correct(req(`/api/v1/employees/${a.id}/scores/S138`, 'PUT', { value: 10.5, reason: 'too high' }), ctx({ id: a.id, sprint: 'S138' }));
    expect(r1.status).toBe(422);
    expect((await r1.json()).error.code).toBe('OUT_OF_RANGE');
    expect((await correct(req(`/api/v1/employees/${a.id}/scores/S138`, 'PUT', { value: 5, reason: 'no' }), ctx({ id: a.id, sprint: 'S138' }))).status).toBe(400);
    expect((await correct(req(`/api/v1/employees/${a.id}/scores/S999`, 'PUT', { value: 5, reason: 'reason' }), ctx({ id: a.id, sprint: 'S999' }))).status).toBe(404);
    expect((await correct(req(`/api/v1/employees/${a.id}/scores/latest`, 'PUT', { value: 5, reason: 'reason' }), ctx({ id: a.id, sprint: 'latest' }))).status).toBe(404);
    expect((await correct(req('/api/v1/employees/none/scores/S138', 'PUT', { value: 5, reason: 'reason' }), ctx({ id: 'none', sprint: 'S138' }))).status).toBe(404);
  });
});

function occurrencesInDb(file: string, needle: string): string[] {
  const sqlite = new Database(file, { readonly: true });
  try {
    const tables = (sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all() as { name: string }[]).map((r) => r.name);
    return tables.flatMap((table) => {
      const cols = (sqlite.prepare(`PRAGMA table_info("${table}")`).all() as { name: string }[]).map((c) => `"${c.name}"`);
      const rows = sqlite.prepare(`SELECT ${cols.join(', ')} FROM "${table}"`).raw().all() as unknown[][];
      return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(needle)).map((r) => `${table}: ${JSON.stringify(r).slice(0, 300)}`);
    });
  } finally {
    sqlite.close();
  }
}

describe('privacy erasure (E-03-06)', () => {
  it('rejects a mismatching confirmation with 422', async () => {
    const a = await employee('Bishal Joshi');
    const res = await erase(req(`/api/v1/employees/${a.id}`, 'DELETE', { confirmName: 'Bishal' }), ctx({ id: a.id }));
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe('CONFIRMATION_MISMATCH');
  });

  it('AC-1/2/3: deletes the person, redacts every reference, deletes uploads, blocks rollback; only the former ID is audited', async () => {
    const { db, useCases } = await getContainer();
    const a = await employee('Bishal Joshi');
    await patchEmployee(req(`/api/v1/employees/${a.id}`, 'PATCH', { employeeCode: 'CTS-BJ' }), ctx({ id: a.id }));
    expect(occurrencesInDb(t.file, 'bishal joshi').length).toBeGreaterThan(0);
    expect(await useCases.eraseEmployee.preview(a.id)).toEqual({ displayName: 'Bishal Joshi', uploads: 1 });

    const res = await erase(req(`/api/v1/employees/${a.id}`, 'DELETE', { confirmName: '  bishal   JOSHI ' }), ctx({ id: a.id }));
    expect(res.status).toBe(204);

    expect(occurrencesInDb(t.file, 'bishal joshi')).toEqual([]);
    expect(occurrencesInDb(t.file, 'cts-bj')).toEqual([]);
    expect(await db.score.count({ where: { employeeId: a.id } })).toBe(0);
    expect(await db.employeeAlias.count({ where: { employeeId: a.id } })).toBe(0);
    expect(readdirSync(path.join(t.dir, 'uploads'))).toEqual([]);
    expect(await db.importBatch.count({ where: { fileKey: { not: null } } })).toBe(0);
    const issue = await db.importIssue.findFirstOrThrow({ where: { code: 'PRECISION_ROUNDED' } });
    expect([issue.employeeName, issue.message]).toEqual(['[erased]', '[erased]']);
    const audit = await db.auditEvent.findFirstOrThrow({ where: { action: 'EMPLOYEE_ERASE' } });
    expect({ entityId: audit.entityId, before: audit.before, after: audit.after, meta: audit.meta }).toEqual({ entityId: a.id, before: null, after: null, meta: null });
    const imports = await useCases.listImports.execute({ limit: 5 });
    expect(imports.items.every((i) => !i.canRollback && !i.hasOriginal)).toBe(true);
    // The dashboard still works without the person.
    const ds = await useCases.getDashboardDataset.execute({ includeInactive: true });
    expect(ds.ok && ds.value.engineers.some((e) => e.name === 'Bishal Joshi')).toBe(false);
  });
});
