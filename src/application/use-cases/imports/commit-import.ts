import { diffImport } from '@/domain/import/diff';
import { hasErrors } from '@/domain/import/issues';
import { normaliseName } from '@/domain/shared/name';
import { err, ok, type Result } from '@/domain/shared/result';
import type { Clock } from '@/application/ports/clock';
import type { ImportBatchRepository, ImportCommitter, ImportStateLoader } from '@/application/ports/imports';
import type { SettingsRepository } from '@/application/ports/settings';
import type { PreviewSnapshot } from './preview-dto';

export type CommitError =
  | 'NOT_FOUND'
  | 'NOT_A_PREVIEW'
  | 'PREVIEW_EXPIRED'
  | 'IMPORT_HAS_ERRORS'
  | 'INVALID_MERGE'
  | 'CONFLICT_STALE_PREVIEW';

export interface CommitInput {
  readonly batchId: string;
  readonly actorId: string;
  readonly merges: readonly { fileName: string; existingEmployeeId: string }[];
}

/**
 * Apply a preview atomically (US-02-07, ADR-007 step 2). The diff is recomputed
 * from the stored parsed rows; the committer's revision guard rejects the
 * commit if anything changed since the preview was taken.
 */
export class CommitImport {
  constructor(
    private readonly deps: {
      readonly batches: ImportBatchRepository;
      readonly state: ImportStateLoader;
      readonly committer: ImportCommitter;
      readonly settings: SettingsRepository;
      readonly clock: Clock;
    },
  ) {}

  async execute(input: CommitInput): Promise<Result<{ commitRevision: number }, CommitError>> {
    const { batches, clock } = this.deps;
    const batch = await batches.findById(input.batchId);
    if (!batch) return err('NOT_FOUND');
    if (batch.status !== 'PREVIEW' || !batch.parsed) return err('NOT_A_PREVIEW');
    const now = clock.now();
    if (batch.expiresAt.getTime() <= now.getTime()) {
      await batches.setStatus(batch.id, 'EXPIRED');
      return err('PREVIEW_EXPIRED');
    }
    if (batch.errorCount > 0) return err('IMPORT_HAS_ERRORS');
    const merges = this.validMerges(batch.summary as PreviewSnapshot, input.merges, batch.parsed.rows.map((r) => r.name));
    if (!merges) return err('INVALID_MERGE');

    const settings = await this.deps.settings.get();
    const current = await this.deps.state.load(batch.parsed.sprints);
    const diff = diffImport(batch.parsed, current, { notScoredOverwrites: settings.importNotScoredOverwrites, merges });
    if (hasErrors(diff.issues)) return err('IMPORT_HAS_ERRORS');
    const outcome = await this.deps.committer.commit({
      batchId: batch.id, baseRevision: batch.baseRevision, sheet: batch.parsed, diff, actorId: input.actorId, now,
    });
    return outcome.ok ? ok(outcome.value) : err(outcome.error);
  }

  /** Only pairs offered as near-duplicates in the preview may be merged. */
  private validMerges(snapshot: PreviewSnapshot, requested: CommitInput['merges'], fileNames: readonly string[]): Map<string, string> | null {
    const offered = new Set(snapshot.nearDuplicates.map((n) => `${n.fileName}|${n.existingEmployeeId}`));
    const out = new Map<string, string>();
    for (const m of requested) {
      if (!offered.has(`${m.fileName}|${m.existingEmployeeId}`) || !fileNames.includes(m.fileName)) return null;
      out.set(normaliseName(m.fileName), m.existingEmployeeId);
    }
    return out;
  }
}
