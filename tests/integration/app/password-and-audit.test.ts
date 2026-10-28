import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { useTestEnvironment } from '../../helpers/test-env';
import type { TestDb } from '../../helpers/test-db';
import { getContainer } from '@/infrastructure/container';
import { seedReferenceData } from '@/infrastructure/db/seed-reference';
import { POST as login } from '@/app/api/v1/auth/login/route';
import { POST as logout } from '@/app/api/v1/auth/logout/route';
import { POST as changePassword } from '@/app/api/v1/auth/password/route';
import { POST as upload } from '@/app/api/v1/imports/route';
import { POST as commit } from '@/app/api/v1/imports/[id]/commit/route';

const BASE = 'http://localhost:3000';
const PW = 'audit-test-password-1';
const NEW_PW = 'audit-test-password-2';
let t: TestDb;

beforeAll(async () => {
  t = await useTestEnvironment();
  const { useCases, db } = await getContainer();
  await seedReferenceData(db);
  await useCases.createInitialAdmin.execute({ email: 'hr@x.com', password: PW });
});
afterAll(async () => {
  await (await getContainer()).close();
  await t.cleanup();
});

async function signIn(password: string): Promise<{ status: number; cookie: string; token: string }> {
  const res = await login(new NextRequest(`${BASE}/api/v1/auth/login`, { method: 'POST', headers: { origin: BASE }, body: JSON.stringify({ email: 'hr@x.com', password }) }));
  const token = /hrm_session=([^;]+)/.exec(res.headers.get('set-cookie') ?? '')?.[1] ?? '';
  return { status: res.status, cookie: `hrm_session=${token}`, token };
}

const post = (url: string, cookie: string, body?: string | FormData) => new NextRequest(`${BASE}${url}`, { method: 'POST', headers: { origin: BASE, cookie }, body });

describe('POST /api/v1/auth/password (E-01-05)', () => {
  it('changes the password, keeps the current session and signs out the others', async () => {
    const a = await signIn(PW);
    const b = await signIn(PW);
    const bad = await changePassword(post('/api/v1/auth/password', a.cookie, JSON.stringify({ currentPassword: 'wrong', newPassword: NEW_PW })));
    expect(bad.status).toBe(401);
    const weak = await changePassword(post('/api/v1/auth/password', a.cookie, JSON.stringify({ currentPassword: PW, newPassword: 'short' })));
    expect([weak.status, (await weak.json()).error.code]).toEqual([400, 'WEAK_PASSWORD']);
    const ok = await changePassword(post('/api/v1/auth/password', a.cookie, JSON.stringify({ currentPassword: PW, newPassword: NEW_PW })));
    expect(ok.status).toBe(204);
    const { useCases } = await getContainer();
    expect((await useCases.validateSession.execute(a.token)).ok).toBe(true);
    expect((await useCases.validateSession.execute(b.token)).ok).toBe(false);
    expect((await signIn(PW)).status).toBe(401);
    expect((await signIn(NEW_PW)).status).toBe(200);
  });
});

describe('audit trail (E-09-01)', () => {
  it('AC-1/AC-2: every sensitive action writes one event and no payload contains secrets', async () => {
    const { db } = await getContainer();
    await db.loginThrottle.deleteMany();
    await signIn('not-the-password');
    const s = await signIn(NEW_PW);
    const form = new FormData();
    form.append('file', new File([readFileSync(path.resolve(__dirname, '../../fixtures/kpi-master-sheet.xlsx'))], 'kpi.xlsx'));
    const preview = await (await upload(post('/api/v1/imports', s.cookie, form))).json();
    await commit(post(`/api/v1/imports/${preview.id}/commit`, s.cookie, '{}'), { params: Promise.resolve({ id: preview.id }) });
    await logout(post('/api/v1/auth/logout', s.cookie));

    const events = await db.auditEvent.findMany({ orderBy: { at: 'asc' }, select: { action: true, actorId: true, before: true, after: true, meta: true, entity: true, entityId: true } });
    const actions = new Set(events.map((e) => e.action));
    for (const a of ['AUTH_LOGIN_OK', 'AUTH_LOGIN_FAIL', 'AUTH_PASSWORD_CHANGE', 'IMPORT_PREVIEW', 'IMPORT_COMMIT', 'AUTH_LOGOUT']) expect(actions, a).toContain(a);
    expect(events.filter((e) => e.action === 'IMPORT_COMMIT' && e.entityId === preview.id)).toHaveLength(1);

    const serialized = JSON.stringify(events);
    for (const secret of [PW, NEW_PW, 'not-the-password', s.token]) expect(serialized).not.toContain(secret);
    expect(serialized).not.toMatch(/"centi"|"cells"|valueCenti/);
  });
});
