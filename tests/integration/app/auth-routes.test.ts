import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { useTestEnvironment } from '../../helpers/test-env';
import type { TestDb } from '../../helpers/test-db';
import { getContainer } from '@/infrastructure/container';
import { POST as login } from '@/app/api/v1/auth/login/route';
import { POST as logout } from '@/app/api/v1/auth/logout/route';
import { GET as me } from '@/app/api/v1/auth/me/route';

let t: TestDb;
const BASE = 'http://localhost:3000';
const EMAIL = 'hr.admin@cloudtech.com';
const PASSWORD = 'integration-test-password';

beforeAll(async () => {
  t = await useTestEnvironment();
  const { useCases } = await getContainer();
  await useCases.createInitialAdmin.execute({ email: EMAIL, password: PASSWORD });
});
afterAll(async () => {
  await (await getContainer()).close();
  await t.cleanup();
});

const loginReq = (email: string, password: string, base = BASE) =>
  new NextRequest(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { origin: base, 'content-type': 'application/json', 'user-agent': 'vitest' },
    body: JSON.stringify({ email, password }),
  });

const withCookie = (url: string, method: string, cookie: string) =>
  new NextRequest(url, { method, headers: { origin: BASE, cookie } });

function sessionCookieFrom(res: Response): string {
  const raw = res.headers.get('set-cookie') ?? '';
  const match = /hrm_session=([^;]*)/.exec(raw);
  return match?.[1] ?? '';
}

describe('POST /api/v1/auth/login', () => {
  it('US-01-01 AC-1: sets an httpOnly, SameSite=Lax, 12h session cookie', async () => {
    const res = await login(loginReq(EMAIL, PASSWORD));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ user: { id: expect.any(String), email: EMAIL } });
    const cookie = res.headers.get('set-cookie') ?? '';
    expect(cookie).toMatch(/hrm_session=[A-Za-z0-9_-]{43}/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=lax/i);
    expect(cookie).toMatch(/Max-Age=43200/);
    expect(cookie).toMatch(/Path=\//);
    expect(cookie).not.toMatch(/Secure/i);
  });

  it('marks the cookie Secure over HTTPS', async () => {
    const res = await login(loginReq(EMAIL, PASSWORD, 'https://hrm.example.com'));
    expect(res.headers.get('set-cookie') ?? '').toMatch(/Secure/i);
  });

  it('stores only the token hash, never the token', async () => {
    const res = await login(loginReq(EMAIL, PASSWORD));
    const token = sessionCookieFrom(res);
    const rows = await t.db.session.findMany({ select: { tokenHash: true } });
    expect(rows.some((r) => r.tokenHash === token)).toBe(false);
    expect(rows.every((r) => /^[0-9a-f]{64}$/.test(r.tokenHash))).toBe(true);
  });

  it('US-01-01 AC-2: wrong password and unknown email give the same generic 401', async () => {
    for (const [email, pw] of [[EMAIL, 'wrong-password'], ['nobody@cloudtech.com', PASSWORD]] as const) {
      const res = await login(loginReq(email, pw));
      expect(res.status).toBe(401);
      expect((await res.json()).error).toEqual({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
      expect(res.headers.get('set-cookie')).toBeNull();
    }
    const fails = await t.db.auditEvent.count({ where: { action: 'AUTH_LOGIN_FAIL' } });
    expect(fails).toBeGreaterThanOrEqual(2);
  });

  it('US-01-01 AC-2: unknown-email timing is within ±50 ms of a wrong-password attempt', async () => {
    const time = async (email: string) => {
      const start = performance.now();
      await login(loginReq(email, 'timing-probe'));
      return performance.now() - start;
    };
    const samples = async (email: string) => {
      const out: number[] = [];
      for (let i = 0; i < 4; i++) out.push(await time(email));
      return out.sort((a, b) => a - b)[1] ?? 0;
    };
    await t.db.loginThrottle.deleteMany();
    const known = await samples(EMAIL);
    await t.db.loginThrottle.deleteMany();
    const unknown = await samples('ghost-timing@cloudtech.com');
    await t.db.loginThrottle.deleteMany();
    expect(Math.abs(known - unknown)).toBeLessThan(50);
  });

  it('US-01-01 AC-3: locks out after 5 failures with 429 + Retry-After, even for the right password', async () => {
    await t.db.loginThrottle.deleteMany();
    for (let i = 0; i < 5; i++) expect((await login(loginReq(EMAIL, 'bad-password'))).status).toBe(401);
    const res = await login(loginReq(EMAIL, PASSWORD));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error.code).toBe('LOCKED_OUT');
    expect(body.error.details.retryAfterSec).toBeGreaterThan(890);
    expect(Number(res.headers.get('retry-after'))).toBe(body.error.details.retryAfterSec);
    expect(await t.db.auditEvent.count({ where: { action: 'AUTH_LOCKOUT' } })).toBe(1);
    await t.db.loginThrottle.deleteMany();
  });

  it('rejects malformed bodies and cross-origin posts', async () => {
    const bad = await login(new NextRequest(`${BASE}/api/v1/auth/login`, { method: 'POST', headers: { origin: BASE }, body: '{"email":""}' }));
    expect(bad.status).toBe(400);
    const evil = await login(
      new NextRequest(`${BASE}/api/v1/auth/login`, { method: 'POST', headers: { origin: 'https://evil.test' }, body: JSON.stringify({ email: EMAIL, password: PASSWORD }) }),
    );
    expect(evil.status).toBe(403);
  });
});

describe('session lifecycle via routes', () => {
  it('GET /me works with the cookie and fails without it', async () => {
    const token = sessionCookieFrom(await login(loginReq(EMAIL, PASSWORD)));
    const ok = await me(withCookie(`${BASE}/api/v1/auth/me`, 'GET', `hrm_session=${token}`));
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ email: EMAIL, idleExpiresAt: expect.any(String), absoluteExpiresAt: expect.any(String) });
    const anon = await me(new NextRequest(`${BASE}/api/v1/auth/me`));
    expect(anon.status).toBe(401);
    expect((await anon.json()).error.code).toBe('UNAUTHENTICATED');
  });

  it('US-01-04 AC-3: logout deletes the session row, clears the cookie and is audited', async () => {
    const token = sessionCookieFrom(await login(loginReq(EMAIL, PASSWORD)));
    const before = await t.db.session.count();
    const res = await logout(withCookie(`${BASE}/api/v1/auth/logout`, 'POST', `hrm_session=${token}`));
    expect(res.status).toBe(204);
    expect(res.headers.get('set-cookie') ?? '').toMatch(/hrm_session=;.*Max-Age=0/i);
    expect(await t.db.session.count()).toBe(before - 1);
    expect(await t.db.auditEvent.count({ where: { action: 'AUTH_LOGOUT' } })).toBeGreaterThanOrEqual(1);
    const after = await me(withCookie(`${BASE}/api/v1/auth/me`, 'GET', `hrm_session=${token}`));
    expect(after.status).toBe(401);
  });

  it('US-01-02 AC-2: an expired session is rejected and its row deleted', async () => {
    const token = sessionCookieFrom(await login(loginReq(EMAIL, PASSWORD)));
    await t.db.session.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    const res = await me(withCookie(`${BASE}/api/v1/auth/me`, 'GET', `hrm_session=${token}`));
    expect(res.status).toBe(401);
    expect(await t.db.session.count()).toBeLessThan(10);
    const { useCases } = await getContainer();
    expect((await useCases.validateSession.execute(token)).ok).toBe(false);
  });
});
