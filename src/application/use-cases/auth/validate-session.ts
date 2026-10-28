import { evaluateSession, shouldTouch, type SessionPolicy } from '@/domain/auth/session-policy';
import { err, ok, type Result } from '@/domain/shared/result';
import type { SessionStore, TokenService } from '@/application/ports/auth';
import type { Clock } from '@/application/ports/clock';

export interface SessionUser {
  readonly userId: string;
  readonly email: string;
  readonly tokenHash: string;
  readonly absoluteExpiresAt: Date;
  readonly idleExpiresAt: Date;
}

export interface ValidateSessionDeps {
  readonly sessions: SessionStore;
  readonly tokens: TokenService;
  readonly clock: Clock;
  readonly policy: SessionPolicy;
}

/**
 * Resolve a session token to the signed-in admin (ADR-006 gate 2). Expired or
 * idle sessions are deleted. lastSeenAt is refreshed at most once per throttle
 * interval, so the effective idle timeout is idle + throttle (accepted, ADR-005).
 */
export class ValidateSession {
  constructor(private readonly deps: ValidateSessionDeps) {}

  async execute(token: string | undefined): Promise<Result<SessionUser, 'UNAUTHENTICATED'>> {
    if (!token) return err('UNAUTHENTICATED');
    const { sessions, tokens, clock, policy } = this.deps;
    const tokenHash = tokens.hash(token);
    const session = await sessions.find(tokenHash);
    if (!session) return err('UNAUTHENTICATED');

    const now = clock.now();
    if (evaluateSession(session, now, policy) !== 'valid') {
      await sessions.revoke(tokenHash);
      return err('UNAUTHENTICATED');
    }
    const touch = shouldTouch(session, now, policy);
    if (touch) await sessions.touch(tokenHash, now);
    const lastSeen = touch ? now : session.lastSeenAt;
    return ok({
      userId: session.userId,
      email: session.email,
      tokenHash,
      absoluteExpiresAt: session.expiresAt,
      idleExpiresAt: new Date(lastSeen.getTime() + policy.idleMs),
    });
  }
}
