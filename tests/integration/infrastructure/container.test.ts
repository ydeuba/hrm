import { afterAll, describe, expect, it } from 'vitest';
import { createTestDb } from '../../helpers/test-db';
import { PrismaAuditLog } from '@/infrastructure/audit/prisma-audit-log';
import { getContainer } from '@/infrastructure/container';
import { systemClock } from '@/infrastructure/clock/system-clock';

const cleanups: (() => Promise<void>)[] = [];
afterAll(async () => {
  for (const c of cleanups) await c();
});

describe('PrismaAuditLog', () => {
  it('appends an audit row with JSON payloads and the clock time', async () => {
    const t = await createTestDb();
    cleanups.push(t.cleanup);
    const at = new Date('2026-10-19T03:15:00.000Z');
    const log = new PrismaAuditLog(t.db, { now: () => at });
    await log.record({ actorId: null, action: 'SETTINGS_UPDATE', entity: 'AppSettings', entityId: '1', before: { a: 1 }, after: { a: 2 } });
    await log.record({ actorId: null, action: 'AUTH_LOGOUT' });
    const rows = await t.db.auditEvent.findMany({ orderBy: { at: 'asc' } });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ action: 'SETTINGS_UPDATE', entity: 'AppSettings', entityId: '1', before: { a: 1 }, after: { a: 2 }, meta: null });
    expect(rows[0]?.at.toISOString()).toBe(at.toISOString());
    expect(rows[1]).toMatchObject({ action: 'AUTH_LOGOUT', entity: null, before: null });
  });
});

describe('systemClock', () => {
  it('returns the current time', () => {
    const before = Date.now();
    const now = systemClock.now().getTime();
    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(Date.now());
  });
});

describe('getContainer', () => {
  it('rejects with the env error and does not cache the failure', async () => {
    const saved = { DATABASE_URL: process.env.DATABASE_URL, DATA_DIR: process.env.DATA_DIR };
    delete process.env.DATABASE_URL;
    delete process.env.DATA_DIR;
    await expect(getContainer()).rejects.toThrow(/DATABASE_URL/);
    Object.assign(process.env, saved);
  });
});
