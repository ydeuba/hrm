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
import { GET as rankings } from '@/app/api/v1/kpi/rankings/route';
import { GET as summaries } from '@/app/api/v1/kpi/summaries/route';
import { GET as profile } from '@/app/api/v1/employees/[id]/profile/route';

const BASE = 'http://localhost:3000';
let t: TestDb;
let cookie = '';
const nameKey = (n: string) => n.replace(/\s+/g, ' ');

beforeAll(async () => {
  t = await useTestEnvironment();
  const { useCases, db } = await getContainer();
  await seedReferenceData(db);
  await useCases.createInitialAdmin.execute({ email: 'hr@x.com', password: 'rankings-test-pass' });
  const actorId = (await db.adminUser.findFirstOrThrow()).id;
  const bytes = new Uint8Array(readFileSync(path.resolve(__dirname, '../../fixtures/kpi-master-sheet.xlsx')));
  const p = await useCases.previewImport.execute({ fileName: 'kpi.xlsx', bytes, actorId });
  if (!p.ok) throw new Error('preview');
  await useCases.commitImport.execute({ batchId: p.value.batchId, actorId, merges: [] });
  const res = await login(new NextRequest(`${BASE}/api/v1/auth/login`, { method: 'POST', headers: { origin: BASE }, body: JSON.stringify({ email: 'hr@x.com', password: 'rankings-test-pass' }) }));
  cookie = /hrm_session=[^;]+/.exec(res.headers.get('set-cookie') ?? '')?.[0] ?? '';
});
afterAll(async () => {
  await (await getContainer()).close();
  await t.cleanup();
});

const get = async (handler: (r: NextRequest, c?: never) => Promise<Response>, url: string) => {
  const res = await handler(new NextRequest(`${BASE}${url}`, { headers: { cookie } }));
  return { status: res.status, body: await res.json() };
};

describe('rankings (E-06-03)', () => {
  it('AC-1: overall ranks match the workbook for all 49', async () => {
    const { body } = await get(rankings, '/api/v1/kpi/rankings?scope=overall');
    const byName = new Map(body.groups[0].rows.map((r: { name: string; rank: number }) => [r.name, r.rank]));
    expect(expected.employees.filter((e) => byName.get(nameKey(e.name)) !== e.overallRank).map((e) => e.name)).toEqual([]);
  });

  it('AC-2: one table per designation in order, ranks restarting at 1', async () => {
    const { body } = await get(rankings, '/api/v1/kpi/rankings?scope=designation');
    expect(body.groups.map((g: { key: string }) => g.key)).toEqual(['Team Lead', 'SSE', 'SE', 'ASE']);
    for (const g of body.groups) expect(g.rows[0].rank).toBe(1);
    expect(body.groups[0].rows[0].name).toBe('Niba Tandukar');
  });

  it('AC-3: last-N window S133–S138 with averages and ranks matching Sheet1/the last-6 block', async () => {
    const { body } = await get(rankings, '/api/v1/kpi/rankings?scope=lastN');
    expect([body.window[0], body.window.at(-1), body.window.length]).toEqual(['S133', 'S138', 6]);
    const rows = new Map(body.groups[0].rows.map((r: { name: string }) => [r.name, r]));
    for (const e of expected.employees) {
      const r = rows.get(nameKey(e.name)) as { rank: number; average: number } | undefined;
      expect(r?.rank, e.name).toBe(e.lastN.rank);
      expect(Math.abs((r?.average ?? 0) - e.lastN.average)).toBeLessThan(0.01);
    }
  });

  it('AC-4: with a 5-sprint minimum, newcomers are listed as not eligible', async () => {
    const { db } = await getContainer();
    const s = await db.appSettings.findUniqueOrThrow({ where: { id: 1 } });
    await db.appSettings.update({ where: { id: 1 }, data: { data: { ...(s.data as object), rankEligibilityMinSprints: 5 } } });
    const { body } = await get(rankings, '/api/v1/kpi/rankings?scope=overall');
    const rows = body.groups[0].rows as { name: string; rank: number | null; eligible: boolean }[];
    expect(rows.find((r) => r.name === 'Dilendra Thagunna')).toMatchObject({ rank: null, eligible: false });
    expect(rows.find((r) => r.rank === 1)?.name).toBe('Niba Tandukar');
    await db.appSettings.update({ where: { id: 1 }, data: { data: s.data ?? {} } });
  });

  it('rejects an invalid range', async () => {
    expect((await get(rankings, '/api/v1/kpi/rankings?from=S999')).status).toBe(400);
    expect((await get(summaries, '/api/v1/kpi/summaries?from=S138&to=S122')).status).toBe(400);
  });
});

describe('summaries (E-06-04, E-06-05)', () => {
  it('team and designation tables, Top 10 and headline match Performance Insights', async () => {
    const { body } = await get(summaries, '/api/v1/kpi/summaries');
    const ins = expected.insights;
    for (const team of ins.teams) {
      const g = body.teams.find((x: { key: string }) => x.key === team.team);
      expect([g.people, g.scoreObs, g.rank], team.team).toEqual([team.people, team.scoreObs, team.rank]);
      expect(Math.abs(g.weightedAverage - team.weightedAvg)).toBeLessThan(0.01);
    }
    expect(body.designations.map((d: { key: string; people: number }) => [d.key, d.people])).toEqual(ins.designations.map((d) => [d.designation, d.people]));
    expect(body.topN.map((r: { name: string; sprints: number }) => [r.name, r.sprints])).toEqual(ins.top10.map((r) => [r.name, r.sprints]));
    expect(body.headline).toMatchObject({ resources: 49, latestSprint: 'S138' });
    expect(Math.abs(body.headline.overallAvg - ins.headline.overallAvg)).toBeLessThan(0.01);
  });

  it('E-06-05 AC-1: the interpretation reproduces the sheet text', async () => {
    const { body } = await get(summaries, '/api/v1/kpi/summaries');
    expect(body.interpretation).toBe(
      'Top established performer (≥5 sprints): Niba Tandukar (DevOps) at 9.53 over 10 sprints. Overall #1 by raw average: Dilendra Thagunna at 10.00 over 1 sprint(s). Leading team: DevOps at 8.97. Latest sprint S138 averaged 8.41 with 96% coverage.',
    );
  });
});

describe('engineer profile (E-06-02)', () => {
  it('AC-1/AC-2: full profile with ranks, per-sprint cells, org average and score sources', async () => {
    const { db } = await getContainer();
    const niba = await db.employee.findFirstOrThrow({ where: { normalisedName: 'niba tandukar' } });
    const res = await profile(new NextRequest(`${BASE}/api/v1/employees/${niba.id}/profile`, { headers: { cookie } }), { params: Promise.resolve({ id: niba.id }) } as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.employee).toMatchObject({ displayName: 'Niba Tandukar', team: { name: 'DevOps' }, designation: { name: 'Team Lead' } });
    expect(body).toMatchObject({ overallRank: 4, rankOf: 49, designationRank: 1, designationSize: 6 });
    expect(body.metrics.sprintsCounted).toBe(10);
    expect(body.series).toHaveLength(17);
    // S122 is N/A in the sheet: not-scored cells are not stored for new employees.
    expect(body.series[0]).toMatchObject({ sprint: 'S122', cell: null, stored: false, source: null });
    expect(body.series[7]).toMatchObject({ sprint: 'S129', cell: 8.33, stored: true, source: { fileName: 'kpi.xlsx' } });
    expect(body.series.at(-1).orgAverage).toBeCloseTo(8.41, 2);
  });

  it('AC-3: unknown id → 404', async () => {
    const res = await profile(new NextRequest(`${BASE}/api/v1/employees/nope/profile`, { headers: { cookie } }), { params: Promise.resolve({ id: 'nope' }) } as never);
    expect(res.status).toBe(404);
  });
});
