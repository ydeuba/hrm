import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { useTestEnvironment } from '../../helpers/test-env';
import type { TestDb } from '../../helpers/test-db';
import { getContainer } from '@/infrastructure/container';
import { seedReferenceData } from '@/infrastructure/db/seed-reference';
import { POST as login } from '@/app/api/v1/auth/login/route';
import { GET as audit } from '@/app/api/v1/audit/route';
import { toAuditQuery } from '@/app/_lib/audit-query';

const BASE = 'http://localhost:3000';
let t: TestDb;
let cookie = '';

beforeAll(async () => {
  t = await useTestEnvironment();
  const { useCases, db } = await getContainer();
  await seedReferenceData(db);
  await useCases.createInitialAdmin.execute({ email: 'hr@x.com', password: 'audit-test-pass' });
  const res = await login(new NextRequest(`${BASE}/api/v1/auth/login`, { method: 'POST', headers: { origin: BASE }, body: JSON.stringify({ email: 'hr@x.com', password: 'audit-test-pass' }) }));
  cookie = /hrm_session=[^;]+/.exec(res.headers.get('set-cookie') ?? '')?.[0] ?? '';
  const actorId = (await db.adminUser.findFirstOrThrow()).id;
  // 60 settings events spread over three Kathmandu days, plus the login above.
  await db.auditEvent.createMany({
    data: Array.from({ length: 60 }, (_, i) => ({
      at: new Date(Date.UTC(2026, 9, 10 + (i % 3), 6, i)), actorId, action: 'SETTINGS_UPDATE', entity: 'KpiSettings',
      before: { bands: [{ min: 8 }], lastNWindow: 6 }, after: { bands: [{ min: 8 + (i % 2) }], lastNWindow: 6 },
    })),
  });
});
afterAll(async () => {
  await (await getContainer()).close();
  await t.cleanup();
});

const get = async (qs: string) => (await audit(new NextRequest(`${BASE}/api/v1/audit${qs}`, { headers: { origin: BASE, cookie } }))).json();

describe('audit viewer (E-09-02)', () => {
  it('AC-1: newest first, 50 per page, cursor reaches every event exactly once', async () => {
    const p1 = await get('');
    expect(p1.items).toHaveLength(50);
    expect(p1.items[0].action).toBe('AUTH_LOGIN_OK');
    const times = p1.items.map((e: { at: string }) => e.at);
    expect(times).toEqual([...times].sort().reverse());
    const p2 = await get(`?cursor=${p1.nextCursor}`);
    expect(p2.items).toHaveLength(11);
    expect(p2.nextCursor).toBeNull();
    expect(new Set([...p1.items, ...p2.items].map((e: { id: string }) => e.id)).size).toBe(61);
  });

  it('AC-1: filters by action and by Kathmandu calendar day', async () => {
    expect((await get('?action=AUTH_LOGIN_OK')).items).toHaveLength(1);
    const day = await get('?action=SETTINGS_UPDATE&from=2026-10-11&to=2026-10-11');
    expect(day.items).toHaveLength(20);
    expect((await get('?action=NOPE')).error.code).toBe('VALIDATION_FAILED');
  });

  it('AC-2: each event carries a leaf-level before/after diff', async () => {
    const { items } = await get('?action=SETTINGS_UPDATE&from=2026-10-10&to=2026-10-10');
    const changed = items.find((e: { changes: unknown[] }) => e.changes.length > 0);
    expect(changed.changes).toEqual([{ path: 'bands.0.min', before: 8, after: 9 }]);
    expect(changed.actorEmail).toBe('hr@x.com');
  });

  it('AC-3: day bounds are Asia/Kathmandu midnight (UTC+05:45)', () => {
    const q = toAuditQuery({ from: '2026-10-11', to: '2026-10-11' });
    expect(q.from?.toISOString()).toBe('2026-10-10T18:15:00.000Z');
    expect(q.to?.toISOString()).toBe('2026-10-11T18:15:00.000Z');
  });
});
