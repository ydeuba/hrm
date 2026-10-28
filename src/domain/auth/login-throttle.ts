/**
 * Login lockout policy (ADR-005): the 5th failure inside a 15-minute window
 * locks the email for 15 minutes from that failure. Attempts during a lockout
 * are neither verified nor counted. Pure functions — time is passed in.
 */
export interface ThrottleState {
  readonly failures: number;
  readonly windowStart: Date;
  readonly lockedUntil: Date | null;
}

export interface ThrottlePolicy {
  readonly maxFailures: number;
  readonly windowMs: number;
  readonly lockMs: number;
}

export const DEFAULT_THROTTLE_POLICY: ThrottlePolicy = Object.freeze({
  maxFailures: 5,
  windowMs: 15 * 60_000,
  lockMs: 15 * 60_000,
});

/** Seconds until the lockout ends, or 0 when the email may attempt a login. */
export function lockoutRemainingSec(state: ThrottleState | null, now: Date): number {
  if (!state?.lockedUntil) return 0;
  const ms = state.lockedUntil.getTime() - now.getTime();
  return ms > 0 ? Math.ceil(ms / 1000) : 0;
}

/** Record a failed attempt; returns the new state and whether this failure triggered a lockout. */
export function registerFailure(
  state: ThrottleState | null,
  now: Date,
  policy: ThrottlePolicy = DEFAULT_THROTTLE_POLICY,
): { state: ThrottleState; lockedNow: boolean } {
  const windowExpired = !state || now.getTime() - state.windowStart.getTime() >= policy.windowMs;
  const failures = windowExpired ? 1 : state.failures + 1;
  const windowStart = windowExpired ? now : state.windowStart;
  const lockedNow = failures >= policy.maxFailures;
  return {
    state: {
      failures: lockedNow ? 0 : failures,
      windowStart: lockedNow ? now : windowStart,
      lockedUntil: lockedNow ? new Date(now.getTime() + policy.lockMs) : null,
    },
    lockedNow,
  };
}
