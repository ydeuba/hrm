import { lockoutRemainingSec, registerFailure } from '@/domain/auth/login-throttle';
import { normaliseEmail } from '@/domain/auth/session-policy';
import { err, ok, type Result } from '@/domain/shared/result';
import type { AuditLog } from '@/application/ports/audit-log';
import type { AdminUserRepository, LoginThrottleRepository, PasswordHasher, SessionStore, TokenService } from '@/application/ports/auth';
import type { Clock } from '@/application/ports/clock';

export interface LoginDeps {
  readonly users: AdminUserRepository;
  readonly sessions: SessionStore;
  readonly throttle: LoginThrottleRepository;
  readonly hasher: PasswordHasher;
  readonly tokens: TokenService;
  readonly audit: AuditLog;
  readonly clock: Clock;
  readonly absoluteSessionMs: number;
}

export interface LoginInput {
  readonly email: string;
  readonly password: string;
  readonly userAgent: string | null;
}

export interface LoginSuccess {
  readonly token: string;
  readonly expiresAt: Date;
  readonly user: { readonly id: string; readonly email: string };
}

export type LoginError =
  | { readonly code: 'INVALID_CREDENTIALS' }
  | { readonly code: 'LOCKED_OUT'; readonly retryAfterSec: number };

const DUMMY_PASSWORD = 'timing-equaliser-not-a-real-password';

/**
 * Authenticate the HR Admin (US-01-01, ADR-005). Unknown emails are verified
 * against a dummy hash so timing doesn't reveal which accounts exist, and are
 * throttled exactly like real ones.
 */
export class Login {
  private dummyHash: Promise<string> | undefined;

  constructor(private readonly deps: LoginDeps) {}

  async execute(input: LoginInput): Promise<Result<LoginSuccess, LoginError>> {
    const { clock, throttle } = this.deps;
    const email = normaliseEmail(input.email);
    const now = clock.now();
    const current = await throttle.get(email);
    const remaining = lockoutRemainingSec(current, now);
    if (remaining > 0) return err({ code: 'LOCKED_OUT', retryAfterSec: remaining });

    const user = await this.deps.users.findByEmail(email);
    const valid = await this.verify(user?.passwordHash, input.password);
    if (!user || !valid) {
      await this.recordFailure(email, current, now);
      return err({ code: 'INVALID_CREDENTIALS' });
    }
    return ok(await this.startSession(user.id, email, input.userAgent, now));
  }

  private async verify(hash: string | undefined, password: string): Promise<boolean> {
    this.dummyHash ??= this.deps.hasher.hash(DUMMY_PASSWORD);
    const target = hash ?? (await this.dummyHash);
    const matches = await this.deps.hasher.verify(target, password);
    return hash !== undefined && matches;
  }

  /** The 5th failure in the window still answers INVALID_CREDENTIALS; the lock applies from the next attempt. */
  private async recordFailure(email: string, current: Parameters<typeof registerFailure>[0], now: Date): Promise<void> {
    const { state, lockedNow } = registerFailure(current, now);
    await this.deps.throttle.save(email, state);
    await this.deps.audit.record({ actorId: null, action: 'AUTH_LOGIN_FAIL', meta: { email } });
    if (lockedNow) {
      await this.deps.audit.record({ actorId: null, action: 'AUTH_LOCKOUT', meta: { email, lockedUntil: state.lockedUntil } });
    }
  }

  private async startSession(userId: string, email: string, userAgent: string | null, now: Date): Promise<LoginSuccess> {
    const { token, tokenHash } = this.deps.tokens.issue();
    const expiresAt = new Date(now.getTime() + this.deps.absoluteSessionMs);
    await this.deps.throttle.reset(email);
    await this.deps.sessions.create({ userId, tokenHash, createdAt: now, expiresAt, userAgent });
    await this.deps.users.recordLogin(userId, now);
    await this.deps.audit.record({ actorId: userId, action: 'AUTH_LOGIN_OK', entity: 'AdminUser', entityId: userId });
    return { token, expiresAt, user: { id: userId, email } };
  }
}
