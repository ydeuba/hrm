import { describe, expect, it } from 'vitest';
import { DEFAULT_THROTTLE_POLICY, lockoutRemainingSec, registerFailure, type ThrottleState } from '@/domain/auth/login-throttle';
import { evaluateSession, normaliseEmail, shouldTouch } from '@/domain/auth/session-policy';

const T0 = new Date('2026-10-19T03:00:00.000Z');
const at = (min: number) => new Date(T0.getTime() + min * 60_000);

describe('registerFailure', () => {
  it('starts a new window on the first failure', () => {
    const { state, lockedNow } = registerFailure(null, T0);
    expect(state).toEqual({ failures: 1, windowStart: T0, lockedUntil: null });
    expect(lockedNow).toBe(false);
  });

  it('locks on the 5th failure inside the window, for 15 minutes from that failure', () => {
    let s: ThrottleState | null = null;
    let locked = false;
    for (let i = 0; i < 5; i++) ({ state: s, lockedNow: locked } = registerFailure(s, at(i)));
    expect(locked).toBe(true);
    expect(s?.lockedUntil).toEqual(at(4 + 15));
    expect(s?.failures).toBe(0);
  });

  it('restarts counting after the window expires', () => {
    const first = registerFailure(null, T0).state;
    const four = { ...first, failures: 4 };
    const { state, lockedNow } = registerFailure(four, at(15));
    expect(lockedNow).toBe(false);
    expect(state).toEqual({ failures: 1, windowStart: at(15), lockedUntil: null });
  });

  it('uses the default policy of 5 failures / 15 min / 15 min', () => {
    expect(DEFAULT_THROTTLE_POLICY).toEqual({ maxFailures: 5, windowMs: 900_000, lockMs: 900_000 });
  });
});

describe('lockoutRemainingSec', () => {
  it('is 0 with no state or no lock', () => {
    expect(lockoutRemainingSec(null, T0)).toBe(0);
    expect(lockoutRemainingSec({ failures: 2, windowStart: T0, lockedUntil: null }, T0)).toBe(0);
  });

  it('counts down to the unlock time and is 0 afterwards', () => {
    const s = { failures: 0, windowStart: T0, lockedUntil: at(15) };
    expect(lockoutRemainingSec(s, T0)).toBe(900);
    expect(lockoutRemainingSec(s, new Date(at(15).getTime() - 500))).toBe(1);
    expect(lockoutRemainingSec(s, at(15))).toBe(0);
  });
});

describe('session policy', () => {
  const policy = { idleMs: 60 * 60_000, touchThrottleMs: 5 * 60_000 };
  const s = { lastSeenAt: T0, expiresAt: at(12 * 60) };

  it('is valid within idle and absolute limits', () => {
    expect(evaluateSession(s, at(60), policy)).toBe('valid');
  });

  it('is idle after more than the idle timeout', () => {
    expect(evaluateSession(s, new Date(at(60).getTime() + 1), policy)).toBe('idle');
  });

  it('is expired at the absolute limit regardless of activity', () => {
    expect(evaluateSession({ lastSeenAt: at(12 * 60 - 1), expiresAt: at(12 * 60) }, at(12 * 60), policy)).toBe('expired');
  });

  it('touches only after the throttle interval', () => {
    expect(shouldTouch(s, at(4), policy)).toBe(false);
    expect(shouldTouch(s, at(5), policy)).toBe(true);
  });

  it('normalises emails', () => {
    expect(normaliseEmail('  HR.Admin@CloudTech.COM ')).toBe('hr.admin@cloudtech.com');
  });
});
