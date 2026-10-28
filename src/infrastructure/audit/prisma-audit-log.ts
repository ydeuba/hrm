import 'server-only';
import type { AuditEntry, AuditLog } from '@/application/ports/audit-log';
import type { Clock } from '@/application/ports/clock';
import { toJson } from '../db/json';
import type { Db } from '../db/prisma';

type AuditWriter = Pick<Db, 'auditEvent'>;

const optionalJson = (value: unknown) => (value === undefined ? undefined : toJson(value));

/** Append-only audit adapter. Accepts a transaction client so audit rows commit atomically with the change. */
export class PrismaAuditLog implements AuditLog {
  constructor(
    private readonly db: AuditWriter,
    private readonly clock: Clock,
  ) {}

  async record(entry: AuditEntry): Promise<void> {
    await this.db.auditEvent.create({
      data: {
        at: this.clock.now(),
        actorId: entry.actorId,
        action: entry.action,
        entity: entry.entity ?? null,
        entityId: entry.entityId ?? null,
        before: optionalJson(entry.before),
        after: optionalJson(entry.after),
        meta: optionalJson(entry.meta),
      },
      select: { id: true },
    });
  }
}
