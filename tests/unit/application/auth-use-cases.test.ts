import { beforeEach, describe, expect, it } from 'vitest';
import { CreateInitialAdmin } from '@/application/use-cases/auth/create-initial-admin';
import { Login } from '@/application/use-cases/auth/login';
import { Logout } from '@/application/use-cases/auth/logout';
import { ValidateSession } from '@/application/use-cases/auth/validate-session';
import {
  FakeClock,
  FakeHasher,
  FakeTokens,
  InMemorySessions,
  InMemoryThrottle,
  InMemoryUsers,
  RecordingAudit,
} from '../../helpers/fakes';

const MIN = 60_000;
const PASSWORD = 'correct-horse-battery';

function setup() {
  const clock = new FakeClock();
  const users = new InMemoryUsers();
  const sessions = new InMemorySessions(users);
  const throttle = new InMemoryThrottle();
  const hasher = new FakeHasher();
  const tokens = new FakeTokens();
  const audit = new RecordingAudit();
  const login = new Login({ users, sessions, throttle, hasher, tokens, audit, clock, absoluteSessionMs: 12 * 60 * MIN });
  const validate = new ValidateSession({ sessions, tokens, clock, policy: { idleMs: 60 * MIN, touchThrottleMs: 5 * MIN } });
  const logout = new Logout({ sessions, audit });
  const createAdmin = new CreateInitialAdmin({ users, hasher });
  return { clock, users, sessions, throttle, hasher, tokens, audit, login, validate, logout, createAdmin };
}

type Ctx = ReturnType<typeof setup>;
let c: Ctx;

beforeEach(async () => {
  c = setup();
  await c.createAdmin.execute({ email: 'HR@cloudtech.com', password: PASSWORD });
});

describe('Login (US-01-01)', () => {
  it('AC-1: creates a 12-hour session for valid credentials (email case-insensitive)', async () => {
    const r = await c.login.execute({ email: '  hr@CloudTech.com ', password: PASSWORD, userAgent: 'vitest' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.user.email).toBe('hr@cloudtech.com');
    expect(r.value.expiresAt.getTime() - c.clock.now().getTime()).toBe(12 * 60 * MIN);
    expect(c.sessions.rows.has(c.tokens.hash(r.value.token))).toBe(true);
    expect(c.users.rows.get(r.value.user.id)?.lastLoginAt).toEqual(c.clock.now());
    expect(c.audit.actions()).toEqual(['AUTH_LOGIN_OK']);
  });

  it('AC-2: rejects a wrong password with a generic error and audits it', async () => {
    const r = await c.login.execute({ email: 'hr@cloudtech.com', password: 'wrong-password', userAgent: null });
    expect(r).toEqual({ ok: false, error: { code: 'INVALID_CREDENTIALS' } });
    expect(c.audit.entries).toEqual([{ actorId: null, action: 'AUTH_LOGIN_FAIL', meta: { email: 'hr@cloudtech.com' } }]);
  });

  it('AC-2: verifies a dummy hash for unknown emails (same work as a real check) and returns the same error', async () => {
    const r = await c.login.execute({ email: 'nobody@cloudtech.com', password: PASSWORD, userAgent: null });
    expect(r).toEqual({ ok: false, error: { code: 'INVALID_CREDENTIALS' } });
    expect(c.hasher.verifyCalls).toBe(1);
  });

  it('AC-2: never accepts the dummy password for an unknown email', async () => {
    const r = await c.login.execute({ email: 'nobody@cloudtech.com', password: 'timing-equaliser-not-a-real-password', userAgent: null });
    expect(r.ok).toBe(false);
  });

  it('AC-3: the 5th failure answers 401; the next attempt is locked for 15 minutes even with the right password', async () => {
    for (let i = 0; i < 5; i++) {
      const r = await c.login.execute({ email: 'hr@cloudtech.com', password: 'nope', userAgent: null });
      expect(r).toEqual({ ok: false, error: { code: 'INVALID_CREDENTIALS' } });
      c.clock.advance(MIN);
    }
    expect(c.audit.actions().filter((a) => a === 'AUTH_LOCKOUT')).toHaveLength(1);
    const verifiesBefore = c.hasher.verifyCalls;
    const locked = await c.login.execute({ email: 'hr@cloudtech.com', password: PASSWORD, userAgent: null });
    expect(locked).toEqual({ ok: false, error: { code: 'LOCKED_OUT', retryAfterSec: 14 * 60 } });
    expect(c.hasher.verifyCalls).toBe(verifiesBefore);

    c.clock.advance(14 * MIN);
    const ok = await c.login.execute({ email: 'hr@cloudtech.com', password: PASSWORD, userAgent: null });
    expect(ok.ok).toBe(true);
  });

  it('AC-3: locks unknown emails too', async () => {
    for (let i = 0; i < 5; i++) await c.login.execute({ email: 'ghost@x.com', password: 'p', userAgent: null });
    const r = await c.login.execute({ email: 'ghost@x.com', password: 'p', userAgent: null });
    expect(r.ok ? null : r.error.code).toBe('LOCKED_OUT');
  });

  it('AC-4: a successful login resets the failure counter', async () => {
    for (let i = 0; i < 4; i++) await c.login.execute({ email: 'hr@cloudtech.com', password: 'nope', userAgent: null });
    expect((await c.login.execute({ email: 'hr@cloudtech.com', password: PASSWORD, userAgent: null })).ok).toBe(true);
    expect(c.throttle.rows.has('hr@cloudtech.com')).toBe(false);
    for (let i = 0; i < 4; i++) await c.login.execute({ email: 'hr@cloudtech.com', password: 'nope', userAgent: null });
    expect((await c.login.execute({ email: 'hr@cloudtech.com', password: PASSWORD, userAgent: null })).ok).toBe(true);
  });
});

describe('ValidateSession (US-01-02 / US-01-04)', () => {
  async function signIn(): Promise<string> {
    const r = await c.login.execute({ email: 'hr@cloudtech.com', password: PASSWORD, userAgent: null });
    if (!r.ok) throw new Error('login failed');
    return r.value.token;
  }

  it('rejects a missing or unknown token', async () => {
    expect(await c.validate.execute(undefined)).toEqual({ ok: false, error: 'UNAUTHENTICATED' });
    expect(await c.validate.execute('forged')).toEqual({ ok: false, error: 'UNAUTHENTICATED' });
  });

  it('accepts a fresh session and reports expiry times', async () => {
    const token = await signIn();
    const r = await c.validate.execute(token);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.email).toBe('hr@cloudtech.com');
      expect(r.value.idleExpiresAt.getTime() - c.clock.now().getTime()).toBe(60 * MIN);
    }
  });

  it('touches lastSeenAt at most every 5 minutes', async () => {
    const token = await signIn();
    const hash = c.tokens.hash(token);
    const createdAt = c.sessions.rows.get(hash)?.lastSeenAt;
    c.clock.advance(4 * MIN);
    await c.validate.execute(token);
    expect(c.sessions.rows.get(hash)?.lastSeenAt).toEqual(createdAt);
    c.clock.advance(MIN);
    await c.validate.execute(token);
    expect(c.sessions.rows.get(hash)?.lastSeenAt).toEqual(c.clock.now());
  });

  it('US-01-04 AC-1: an idle session (> 65 min without activity) is rejected and deleted', async () => {
    const token = await signIn();
    c.clock.advance(66 * MIN);
    expect((await c.validate.execute(token)).ok).toBe(false);
    expect(c.sessions.rows.size).toBe(0);
  });

  it('US-01-04 AC-2: a session older than 12 hours is rejected even when active', async () => {
    const token = await signIn();
    for (let i = 0; i < 24; i++) {
      c.clock.advance(30 * MIN);
      await c.validate.execute(token);
    }
    expect((await c.validate.execute(token)).ok).toBe(false);
  });

  it('US-01-04 AC-3: logout deletes the session and is audited', async () => {
    const token = await signIn();
    const r = await c.validate.execute(token);
    if (!r.ok) throw new Error('expected session');
    await c.logout.execute({ tokenHash: r.value.tokenHash, userId: r.value.userId });
    expect((await c.validate.execute(token)).ok).toBe(false);
    expect(c.audit.actions()).toContain('AUTH_LOGOUT');
  });
});

describe('CreateInitialAdmin (US-01-03)', () => {
  it('AC-1: creates one admin with a hashed password', async () => {
    const fresh = setup();
    const r = await fresh.createAdmin.execute({ email: 'Admin@Cloudtech.com', password: 'a-very-long-password' });
    expect(r).toEqual({ ok: true, value: { status: 'created', email: 'admin@cloudtech.com' } });
    const [user] = [...fresh.users.rows.values()];
    expect(user?.passwordHash).toBe('hashed:a-very-long-password');
  });

  it('AC-2: refuses missing or invalid input and creates nothing', async () => {
    const fresh = setup();
    expect(await fresh.createAdmin.execute({})).toEqual({ ok: false, error: 'MISSING_EMAIL' });
    expect(await fresh.createAdmin.execute({ email: 'not-an-email', password: 'a-very-long-password' })).toEqual({ ok: false, error: 'INVALID_EMAIL' });
    expect(await fresh.createAdmin.execute({ email: 'a@b.co' })).toEqual({ ok: false, error: 'MISSING_PASSWORD' });
    expect(await fresh.createAdmin.execute({ email: 'a@b.co', password: 'short' })).toEqual({ ok: false, error: 'WEAK_PASSWORD' });
    expect(fresh.users.rows.size).toBe(0);
  });

  it('AC-3: re-running for an existing admin neither duplicates nor changes the password', async () => {
    const r = await c.createAdmin.execute({ email: 'hr@cloudtech.com', password: 'another-long-password' });
    expect(r).toEqual({ ok: true, value: { status: 'exists', email: 'hr@cloudtech.com' } });
    expect(c.users.rows.size).toBe(1);
    expect([...c.users.rows.values()][0]?.passwordHash).toBe(`hashed:${PASSWORD}`);
  });
});
