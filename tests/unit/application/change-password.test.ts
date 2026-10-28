import { beforeEach, describe, expect, it } from 'vitest';
import { ChangePassword } from '@/application/use-cases/auth/change-password';
import { CreateInitialAdmin } from '@/application/use-cases/auth/create-initial-admin';
import { FakeClock, FakeHasher, InMemorySessions, InMemoryUsers, RecordingAudit } from '../../helpers/fakes';

const OLD = 'original-password-1';
const NEW = 'brand-new-password-2';

let users: InMemoryUsers;
let sessions: InMemorySessions;
let audit: RecordingAudit;
let change: ChangePassword;
let userId: string;

beforeEach(async () => {
  users = new InMemoryUsers();
  sessions = new InMemorySessions(users);
  audit = new RecordingAudit();
  const hasher = new FakeHasher();
  await new CreateInitialAdmin({ users, hasher }).execute({ email: 'hr@x.com', password: OLD });
  userId = [...users.rows.values()][0]?.id ?? '';
  const now = new Date();
  for (const t of ['current', 'other-1', 'other-2']) await sessions.create({ userId, tokenHash: t, createdAt: now, expiresAt: new Date(now.getTime() + 1e7), userAgent: null });
  change = new ChangePassword({ users, sessions, hasher, audit, clock: new FakeClock() });
});

describe('ChangePassword (E-01-05)', () => {
  it('AC-1: changes the password, revokes other sessions and audits', async () => {
    expect(await change.execute({ userId, tokenHash: 'current', currentPassword: OLD, newPassword: NEW })).toEqual({ ok: true, value: undefined });
    expect(users.rows.get(userId)?.passwordHash).toBe(`hashed:${NEW}`);
    expect([...sessions.rows.keys()]).toEqual(['current']);
    expect(audit.actions()).toEqual(['AUTH_PASSWORD_CHANGE']);
  });

  it('AC-2: a wrong current password is rejected and nothing changes', async () => {
    expect(await change.execute({ userId, tokenHash: 'current', currentPassword: 'nope', newPassword: NEW })).toEqual({ ok: false, error: 'INVALID_CREDENTIALS' });
    expect(users.rows.get(userId)?.passwordHash).toBe(`hashed:${OLD}`);
    expect(sessions.rows.size).toBe(3);
    expect(await change.execute({ userId: 'ghost', tokenHash: 'x', currentPassword: OLD, newPassword: NEW })).toEqual({ ok: false, error: 'INVALID_CREDENTIALS' });
  });

  it('AC-3: rejects short or unchanged passwords', async () => {
    expect(await change.execute({ userId, tokenHash: 'current', currentPassword: OLD, newPassword: 'short' })).toEqual({ ok: false, error: 'WEAK_PASSWORD' });
    expect(await change.execute({ userId, tokenHash: 'current', currentPassword: OLD, newPassword: OLD })).toEqual({ ok: false, error: 'WEAK_PASSWORD' });
    expect(audit.entries).toHaveLength(0);
  });
});
