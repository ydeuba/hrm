/** Session lifetime rules (ADR-005). Pure — times are passed in. */
export interface SessionTimes {
  readonly lastSeenAt: Date;
  readonly expiresAt: Date;
}

export interface SessionPolicy {
  readonly idleMs: number;
  /** Minimum gap between lastSeenAt writes, to avoid a DB write per request. */
  readonly touchThrottleMs: number;
}

export type SessionVerdict = 'valid' | 'expired' | 'idle';

export function evaluateSession(s: SessionTimes, now: Date, policy: SessionPolicy): SessionVerdict {
  if (now.getTime() >= s.expiresAt.getTime()) return 'expired';
  if (now.getTime() - s.lastSeenAt.getTime() > policy.idleMs) return 'idle';
  return 'valid';
}

export function shouldTouch(s: SessionTimes, now: Date, policy: SessionPolicy): boolean {
  return now.getTime() - s.lastSeenAt.getTime() >= policy.touchThrottleMs;
}

/** Normalise an email for lookup and throttling: trimmed, lower-case. */
export function normaliseEmail(raw: string): string {
  return raw.trim().toLowerCase();
}
