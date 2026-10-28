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
import { GET as exportEngineers } from '@/app/api/v1/exports/engineers/route';
import { GET as exportRankings } from '@/app/api/v1/exports/rankings/route';
import { GET as dataset } from '@/app/api/v1/kpi/dataset/route';

const BASE = 'http://localhost:3000';
let t: TestDb;
let cookie = '';

beforeAll(async () => {
  t = await useTestEnvironment();
  const { useCases, db } = await getContainer();
  await seedReferenceData(db);
  await useCases.createInitialAdmin.execute({ email: 'hr@x.com', password: 'export-test-pass' });
  const actorId = (await db.adminUser.findFirstOrThrow()).id;
  const bytes = new Uint8Array(readFileSync(path.resolve(__dirname, '../../fixtures/kpi-master-sheet.xlsx')));
  const p = await useCases.previewImport.execute({ fileName: 'kpi.xlsx', bytes, actorId });
  if (!p.ok) throw new Error('preview');
  await useCases.commitImport.execute({ batchId: p.value.batchId, actorId, merges: [] });
  const res = await login(new NextRequest(`${BASE}/api/v1/auth/login`, { method: 'POST', headers: { origin: BASE }, body: JSON.stringify({ email: 'hr@x.com', password: 'export-test-pass' }) }));
  cookie = /hrm_session=[^;]+/.exec(res.headers.get('set-cookie') ?? '')?.[0] ?? '';
});
afterAll(async () => {
  await (await getContainer()).close();
  await t.cleanup();
});

const req = (url: string) => new NextRequest(`${BASE}${url}`, { headers: { origin: BASE, cookie } });
const today = () => new Date().toISOString().slice(0, 10).replace(/-/g, '');

async function sheetRows(res: Response, sheet = 0) {
  const wb = XLSX.read(new Uint8Array(await res.arrayBuffer()), { type: 'array' });
  return XLSX.utils.sheet_to_json<(string | number | null)[]>(wb.Sheets[wb.SheetNames[sheet] ?? ''] ?? {}, { header: 1, defval: null });
}

describe('exports (E-07-02 / E-07-03)', () => {
  it('E-07-02 AC-1: xlsx contains exactly the visible rows with per-sprint columns and the dated filename', async () => {
    const ds = await (await dataset(req('/api/v1/kpi/dataset'))).json();
    const res = await exportEngineers(req('/api/v1/exports/engineers'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-disposition')).toBe(`attachment; filename="cloudtech-kpi_${ds.range.from}-${ds.range.to}_${today()}.xlsx"`);
    const rows = await sheetRows(res);
    expect(rows[0]?.slice(0, 10)).toEqual(['Rank', 'Name', 'Team', 'Designation', 'Sprints', 'Total', 'Avg score', 'Last 3', 'Momentum', 'Rating']);
    expect(rows[0]?.slice(10)).toEqual(ds.sprints);
    expect(rows).toHaveLength(ds.engineers.filter((e: { status: string }) => e.status === 'ACTIVE').length + 1);
  });

  it('E-07-02 AC-1: filters narrow the export the same way as the dashboard', async () => {
    const all = await sheetRows(await exportEngineers(req('/api/v1/exports/engineers')));
    const team = String(all[1]?.[2]);
    const filtered = await sheetRows(await exportEngineers(req(`/api/v1/exports/engineers?team=${encodeURIComponent(team)}`)));
    expect(filtered.length).toBeLessThan(all.length);
    expect(filtered.slice(1).every((r) => r[2] === team)).toBe(true);
  });

  it('E-07-02 AC-3: CSV is UTF-8 with BOM', async () => {
    const res = await exportEngineers(req('/api/v1/exports/engineers?format=csv'));
    expect(res.headers.get('content-type')).toBe('text/csv; charset=utf-8');
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(new TextDecoder().decode(bytes.slice(3)).split('\n')[0]).toMatch(/^Rank,Name,Team/);
  });

  it('rejects an invalid range with 400', async () => {
    expect((await exportEngineers(req('/api/v1/exports/engineers?from=S999&to=S998'))).status).toBe(400);
  });

  it('E-07-03: rankings workbook has Overall, By designation and Last N sheets', async () => {
    const res = await exportRankings(req('/api/v1/exports/rankings'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-disposition')).toMatch(/^attachment; filename="cloudtech-kpi-rankings_S\d+-S\d+_\d{8}\.xlsx"$/);
    const wb = XLSX.read(new Uint8Array(await res.arrayBuffer()), { type: 'array' });
    expect(wb.SheetNames).toEqual(['Overall', 'By designation', 'Last 6 sprints']);
  });
});
