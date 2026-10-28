import { err, ok, type Result } from '@/domain/shared/result';
import type { AuditLog } from '@/application/ports/audit-log';
import type { AdminUserRepository, PasswordHasher, SessionStore } from '@/application/ports/auth';
import type { Clock } from '@/application/ports/clock';
import { MIN_PASSWORD_LENGTH } from './create-initial-admin';

export type ChangePasswordError = 'INVALID_CREDENTIALS' | 'WEAK_PASSWORD';

/**
 * Rotate the HR Admin's password (US-01-04 / E-01-05): verify the current
 * password, require ≥ 12 characters and a different value, then revoke every
 * other session so stolen sessions die with the old password.
 */
export class ChangePassword {
  constructor(
    private readonly deps: {
      readonly users: AdminUserRepository;
      readonly sessions: SessionStore;
      readonly hasher: PasswordHasher;
      readonly audit: AuditLog;
      readonly clock: Clock;
    },
  ) {}

  async execute(input: { userId: string; tokenHash: string; currentPassword: string; newPassword: string }): Promise<Result<void, ChangePasswordError>> {
    const user = await this.deps.users.findById(input.userId);
    if (!user || !(await this.deps.hasher.verify(user.passwordHash, input.currentPassword))) return err('INVALID_CREDENTIALS');
    if (input.newPassword.length < MIN_PASSWORD_LENGTH || input.newPassword === input.currentPassword) return err('WEAK_PASSWORD');
    await this.deps.users.updatePassword(user.id, await this.deps.hasher.hash(input.newPassword), this.deps.clock.now());
    await this.deps.sessions.revokeAllFor(user.id, input.tokenHash);
    await this.deps.audit.record({ actorId: user.id, action: 'AUTH_PASSWORD_CHANGE', entity: 'AdminUser', entityId: user.id });
    return ok(undefined);
  }
}
