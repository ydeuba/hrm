import { err, ok, type Result } from '@/domain/shared/result';
import type { Clock } from '@/application/ports/clock';
import type { ImportBatchRepository } from '@/application/ports/imports';

export type RollbackError = 'NOT_FOUND' | 'NOT_LATEST' | 'CONFLICT_LATER_CHANGES';

/** Reverses a committed batch from its journal (ADR-007 step 3). */
export interface ImportRollbacker {
  rollback(input: { batchId: string; commitRevision: number; actorId: string; now: Date }): Promise<Result<void, 'CONFLICT_LATER_CHANGES'>>;
}

/**
 * Undo the most recent import (US-02-06): allowed only for the latest
 * committed batch while nothing else changed scores since (scoreRevision ==
 * commitRevision). Settings changes do not block it.
 */
export class RollbackImport {
  constructor(private readonly deps: { readonly batches: ImportBatchRepository; readonly rollbacker: ImportRollbacker; readonly clock: Clock }) {}

  async execute(input: { batchId: string; actorId: string }): Promise<Result<void, RollbackError>> {
    const batch = await this.deps.batches.findById(input.batchId);
    if (!batch || batch.status !== 'COMMITTED' || batch.commitRevision === null) return err('NOT_FOUND');
    const latest = await this.deps.batches.latestCommittedRef();
    if (latest?.id !== batch.id) return err('NOT_LATEST');
    const result = await this.deps.rollbacker.rollback({ batchId: batch.id, commitRevision: batch.commitRevision, actorId: input.actorId, now: this.deps.clock.now() });
    return result.ok ? ok(undefined) : err(result.error);
  }
}
