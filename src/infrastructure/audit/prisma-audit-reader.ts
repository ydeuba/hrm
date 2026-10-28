import 'server-only';
import type { AuditQuery, AuditReader, AuditRecord } from '@/application/ports/audit-log';
import type { Db } from '../db/prisma';

/** Keyset pagination over (at desc, id desc) using Prisma's cursor. */
export class PrismaAuditReader implements AuditReader {
  constructor(private readonly db: Db) {}

  async list(q: AuditQuery): Promise<{ items: AuditRecord[]; nextCursor: string | null }> {
    const rows = await this.db.auditEvent.findMany({
      where: {
        ...(q.action ? { action: q.action } : {}),
        ...(q.from || q.to ? { at: { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lt: q.to } : {}) } } : {}),
      },
      orderBy: [{ at: 'desc' }, { id: 'desc' }],
      take: q.limit + 1,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
      select: { id: true, at: true, action: true, entity: true, entityId: true, before: true, after: true, meta: true, actor: { select: { email: true } } },
    });
    const page = rows.slice(0, q.limit);
    return {
      items: page.map(({ actor, ...r }) => ({ ...r, actorEmail: actor?.email ?? null })),
      nextCursor: rows.length > q.limit ? (page.at(-1)?.id ?? null) : null,
    };
  }
}
