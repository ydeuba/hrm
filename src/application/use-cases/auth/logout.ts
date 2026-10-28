import type { AuditLog } from '@/application/ports/audit-log';
import type { SessionStore } from '@/application/ports/auth';

/** End the current session server-side (US-01-02 AC-2). Idempotent. */
export class Logout {
  constructor(
    private readonly deps: { readonly sessions: SessionStore; readonly audit: AuditLog },
  ) {}

  async execute(input: { readonly tokenHash: string; readonly userId: string }): Promise<void> {
    await this.deps.sessions.revoke(input.tokenHash);
    await this.deps.audit.record({ actorId: input.userId, action: 'AUTH_LOGOUT', entity: 'AdminUser', entityId: input.userId });
  }
}
