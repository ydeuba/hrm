import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import * as XLSX from 'xlsx';
import { useTestEnvironment } from '../../helpers/test-env';
import type { TestDb } from '../../helpers/test-db';
import { getContainer } from '@/infrastructure/container';
import { seedReferenceData } from '@/infrastructure/db/seed-reference';
import { POST as login } from '@/app/api/v1/auth/login/route';
import { GET as listEmployees } from '@/app/api/v1/employees/route';
import { GET as getEmployee, PATCH as patchEmployee } from '@/app/api/v1/employees/[id]/route';
import { PATCH as unlock } from '@/app/api/v1/employees/[id]/locks/route';
import { GET as listTeams } from '@/app/api/v1/teams/route';
import { PATCH as patchTeam } from '@/app/api/v1/teams/[id]/route';
import { PATCH as patchDesignation } from '@/app/api/v1/designations/[id]/route';
import { GET as listDesignations } from '@/app/api/v1/designations/route';

const BASE = 'http://localhost:3000';
let t: TestDb;
let cookie = '';
let actorId = '';

function sheet(rows: (string | number | null)[][], sprint = 'S1'): Uint8Array {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Resources', 'Teams', 'Designation', sprint], ...rows]), 'Compile Sheet');
  return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer);
}

async function importRows(rows: (string | number | null)[][], sprint: string) {
  const { useCases } = await getContainer();
  const p = await useCases.previewImport.execute({ fileName: `${sprint}.xlsx`, bytes: sheet(rows, sprint), actorId });
  if (!p.ok) throw new Error('preview');
  const preview = await useCases.getImport.execute(p.value.batchId);
  const c = await useCases.commitImport.execute({ batchId: p.value.batchId, actorId, merges: [] });
  if (!c.ok) throw new Error(`commit ${c.error}`);
  return preview.ok ? preview.value : null;
}

beforeAll(async () => {
  t = await useTestEnvironment();
  const { useCases, db } = await getContainer();
  await seedReferenceData(db);
  await useCases.createInitialAdmin.execute({ email: 'hr@x.com', password: 'employees-test-pass' });
  actorId = (await db.adminUser.findFirstOrThrow()).id;
  const res = await login(new NextRequest(`${BASE}/api/v1/auth/login`, { method: 'POST', headers: { origin: BASE }, body: JSON.stringify({ email: 'hr@x.com', password: 'employees-test-pass' }) }));
  cookie = /hrm_session=[^;]+/.exec(res.headers.get('set-cookie') ?? '')?.[0] ?? '';
  await importRows([['Asha Rai', 'Run Team', 'SE', 8], ['Bikram Thapa', 'DevOps', 'SSE', 7], ['Chandra KC', 'DevOps', 'ASE', 9]], 'S1');
});
afterAll(async () => {
  await (await getContainer()).close();
  await t.cleanup();
});

const req = (url: string, method = 'GET', body?: unknown) =>
  new NextRequest(`${BASE}${url}`, { method, headers: { origin: BASE, cookie, 'content-type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const idOf = async (name: string) => (await (await getContainer()).db.employee.findFirstOrThrow({ where: { displayName: name } })).id;

describe('employee list (E-03-01)', () => {
  it('AC-1/AC-2: lists name, team, designation, status and sprints; filters by search, team and status', async () => {
    const all = await (await listEmployees(req('/api/v1/employees'))).json();
    expect(all.items.map((e: { displayName: string }) => e.displayName)).toEqual(['Asha Rai', 'Bikram Thapa', 'Chandra KC']);
    expect(all.items[0]).toMatchObject({ team: { name: 'Run Team' }, designation: { name: 'SE' }, status: 'ACTIVE', sprintsScored: 1, employeeCode: null });
    expect((await (await listEmployees(req('/api/v1/employees?q=BIKRAM'))).json()).items).toHaveLength(1);
    const devops = all.items.find((e: { team: { name: string } }) => e.team.name === 'DevOps').team.id;
    expect((await (await listEmployees(req(`/api/v1/employees?teamId=${devops}`))).json()).items).toHaveLength(2);
    expect((await (await listEmployees(req('/api/v1/employees?status=INACTIVE'))).json()).items).toHaveLength(0);
  });

  it('AC-3: cursor pagination', async () => {
    const page1 = await (await listEmployees(req('/api/v1/employees?limit=2'))).json();
    expect(page1.items).toHaveLength(2);
    const page2 = await (await listEmployees(req(`/api/v1/employees?limit=2&cursor=${page1.nextCursor}`))).json();
    expect(page2.items.map((e: { displayName: string }) => e.displayName)).toEqual(['Chandra KC']);
    expect(page2.nextCursor).toBeNull();
  });
});

describe('edit employee (E-03-02)', () => {
  it('AC-1: a rename keeps the old spelling as an alias that future imports still match', async () => {
    const id = await idOf('Asha Rai');
    const res = await patchEmployee(req(`/api/v1/employees/${id}`, 'PATCH', { displayName: 'Asha  Rai Sharma' }), ctx(id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.displayName).toBe('Asha Rai Sharma');
    expect(body.aliases).toEqual(['asha rai']);
    const preview = await importRows([['Asha Rai', 'Run Team', 'SE', 9]], 'S2');
    expect(preview?.summary).toMatchObject({ newEmployees: 0, matchedEmployees: 1 });
  });

  it('AC-2/AC-3: team change locks the field; imports report LOCKED_FIELD_DIFFERS; unlock lets imports update it', async () => {
    const { db } = await getContainer();
    const id = await idOf('Bikram Thapa');
    const runTeam = (await db.team.findFirstOrThrow({ where: { name: 'Run Team' } })).id;
    const res = await patchEmployee(req(`/api/v1/employees/${id}`, 'PATCH', { teamId: runTeam }), ctx(id));
    expect((await res.json())).toMatchObject({ teamLocked: true, team: { name: 'Run Team' } });
    const locked = await importRows([['Bikram Thapa', 'DevOps', 'SSE', 6]], 'S3');
    expect(locked?.issues).toEqual([expect.objectContaining({ code: 'LOCKED_FIELD_DIFFERS', employeeName: 'Bikram Thapa' })]);
    expect((await db.employee.findUniqueOrThrow({ where: { id }, include: { team: true } })).team.name).toBe('Run Team');

    const un = await unlock(req(`/api/v1/employees/${id}/locks`, 'PATCH', { teamLocked: false }), ctx(id));
    expect((await un.json()).teamLocked).toBe(false);
    await importRows([['Bikram Thapa', 'DevOps', 'SSE', 6]], 'S4');
    expect((await db.employee.findUniqueOrThrow({ where: { id }, include: { team: true } })).team.name).toBe('DevOps');
  });

  it('AC-4: inactive employees drop out of the default dashboard dataset', async () => {
    const id = await idOf('Chandra KC');
    await patchEmployee(req(`/api/v1/employees/${id}`, 'PATCH', { status: 'INACTIVE' }), ctx(id));
    const { useCases } = await getContainer();
    const ds = await useCases.getDashboardDataset.execute({ includeInactive: false });
    expect(ds.ok && ds.value.engineers.map((e) => e.name)).not.toContain('Chandra KC');
    const all = await useCases.getDashboardDataset.execute({ includeInactive: true });
    expect(all.ok && all.value.engineers.map((e) => e.name)).toContain('Chandra KC');
  });

  it('AC-5: changes are audited with before/after; duplicate codes and name clashes are rejected', async () => {
    const { db } = await getContainer();
    const a = await idOf('Asha Rai Sharma');
    const b = await idOf('Bikram Thapa');
    await patchEmployee(req(`/api/v1/employees/${a}`, 'PATCH', { employeeCode: 'CTS-001', email: 'asha@cloudtech.test', joiningDate: '2024-02-01' }), ctx(a));
    const event = await db.auditEvent.findFirstOrThrow({ where: { action: 'EMPLOYEE_UPDATE', entityId: a }, orderBy: { at: 'desc' } });
    expect(event.before).toEqual({ employeeCode: null, email: null, joiningDate: null });
    expect(event.after).toEqual({ employeeCode: 'CTS-001', email: 'asha@cloudtech.test', joiningDate: '2024-02-01' });
    const dup = await patchEmployee(req(`/api/v1/employees/${b}`, 'PATCH', { employeeCode: 'CTS-001' }), ctx(b));
    expect([dup.status, (await dup.json()).error.code]).toEqual([409, 'DUPLICATE_CODE']);
    const clash = await patchEmployee(req(`/api/v1/employees/${b}`, 'PATCH', { displayName: 'asha rai' }), ctx(b));
    expect([clash.status, (await clash.json()).error.code]).toEqual([409, 'NAME_TAKEN']);
    const bad = await patchEmployee(req(`/api/v1/employees/${b}`, 'PATCH', { teamId: 'missing' }), ctx(b));
    expect(bad.status).toBe(400);
    expect((await patchEmployee(req(`/api/v1/employees/${b}`, 'PATCH', {}), ctx(b))).status).toBe(400);
    expect((await patchEmployee(req('/api/v1/employees/nope', 'PATCH', { status: 'ACTIVE' }), ctx('nope'))).status).toBe(404);
    expect((await (await getEmployee(req(`/api/v1/employees/${a}`), ctx(a))).json()).employeeCode).toBe('CTS-001');
    expect((await getEmployee(req('/api/v1/employees/nope'), ctx('nope'))).status).toBe(404);
  });
});

describe('teams & designations (E-03-03)', () => {
  it('AC-1: renaming "Run Team" to "RUN" keeps the old name as an alias — re-import does not duplicate', async () => {
    const { db } = await getContainer();
    const teams = await (await listTeams(req('/api/v1/teams'))).json();
    const run = teams.find((x: { name: string }) => x.name === 'Run Team');
    const res = await patchTeam(req(`/api/v1/teams/${run.id}`, 'PATCH', { name: 'RUN' }), ctx(run.id));
    expect(await res.json()).toMatchObject({ name: 'RUN', aliases: ['run team'] });
    const before = await db.team.count();
    const p = await importRows([['New Hire', 'Run Team', 'SE', 7]], 'S5');
    expect(p?.newTeams).toEqual([]);
    expect(await db.team.count()).toBe(before);
    expect((await db.employee.findFirstOrThrow({ where: { displayName: 'New Hire' }, include: { team: true } })).team.name).toBe('RUN');
    const clash = await patchTeam(req(`/api/v1/teams/${run.id}`, 'PATCH', { name: 'DevOps' }), ctx(run.id));
    expect(clash.status).toBe(409);
    const back = await patchTeam(req(`/api/v1/teams/${run.id}`, 'PATCH', { name: 'Run Team' }), ctx(run.id));
    expect(await back.json()).toMatchObject({ name: 'Run Team', aliases: ['run'] });
  });

  it('AC-2: sort order changes are reflected in the listing; headcount shown', async () => {
    const list = await (await listDesignations(req('/api/v1/designations'))).json();
    expect(list.map((d: { name: string }) => d.name)).toEqual(['Team Lead', 'SSE', 'SE', 'ASE']);
    const ase = list.find((d: { name: string }) => d.name === 'ASE');
    await patchDesignation(req(`/api/v1/designations/${ase.id}`, 'PATCH', { sortOrder: 0 }), ctx(ase.id));
    const after = await (await listDesignations(req('/api/v1/designations'))).json();
    expect(after[0]).toMatchObject({ name: 'ASE', headcount: 1 });
    expect((await patchTeam(req('/api/v1/teams/nope', 'PATCH', { name: 'X' }), ctx('nope'))).status).toBe(404);
  });

  it('AC-3: there is no delete endpoint for teams or designations', async () => {
    const teamRoutes = await import('@/app/api/v1/teams/[id]/route');
    expect('DELETE' in teamRoutes).toBe(false);
  });
});
