import { diffJson, type FieldChange } from '@/domain/shared/json-diff';
import type { AuditQuery, AuditReader } from '@/application/ports/audit-log';

export interface AuditEventDto {
  readonly id: string;
  readonly at: string;
  readonly actorEmail: string | null;
  readonly action: string;
  readonly entity: string | null;
  readonly entityId: string | null;
  readonly changes: readonly FieldChange[];
  readonly meta: unknown;
}

/** Read-only audit trail (US-09-02): newest first, with a leaf-level before/after diff per event. */
export class ListAuditEvents {
  constructor(private readonly deps: { readonly reader: AuditReader }) {}

  async execute(q: AuditQuery): Promise<{ items: AuditEventDto[]; nextCursor: string | null }> {
    const { items, nextCursor } = await this.deps.reader.list(q);
    return {
      items: items.map((r) => ({
        id: r.id, at: r.at.toISOString(), actorEmail: r.actorEmail, action: r.action, entity: r.entity, entityId: r.entityId,
        changes: r.before === null && r.after === null ? [] : diffJson(r.before ?? undefined, r.after ?? undefined),
        meta: r.meta,
      })),
      nextCursor,
    };
  }
}
