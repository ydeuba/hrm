import { err, ok, type Result } from '@/domain/shared/result';
import type { AuditLog } from '@/application/ports/audit-log';
import type { ImportBatchRepository } from '@/application/ports/imports';

/** Discard an uncommitted preview (US-02-03 AC-4). */
export class DiscardImport {
  constructor(private readonly deps: { readonly batches: ImportBatchRepository; readonly audit: AuditLog }) {}

  async execute(input: { batchId: string; actorId: string }): Promise<Result<void, 'NOT_FOUND' | 'NOT_A_PREVIEW'>> {
    const batch = await this.deps.batches.findById(input.batchId);
    if (!batch) return err('NOT_FOUND');
    if (batch.status !== 'PREVIEW') return err('NOT_A_PREVIEW');
    await this.deps.batches.setStatus(batch.id, 'DISCARDED');
    await this.deps.audit.record({ actorId: input.actorId, action: 'IMPORT_DISCARD', entity: 'ImportBatch', entityId: batch.id });
    return ok(undefined);
  }
}
