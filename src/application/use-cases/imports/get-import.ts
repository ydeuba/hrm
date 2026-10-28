import { err, ok, type Result } from '@/domain/shared/result';
import type { Clock } from '@/application/ports/clock';
import type { ImportBatchRecord, ImportBatchRepository } from '@/application/ports/imports';
import type { ImportPreviewDto, PreviewSnapshot } from './preview-dto';

export function toPreviewDto(
  b: ImportBatchRecord,
  issues: ImportPreviewDto['issues'],
  sameAs: { id: string; committedAt: Date } | null,
  now: Date,
): ImportPreviewDto {
  const snapshot = b.summary as PreviewSnapshot;
  const isLivePreview = b.status === 'PREVIEW' && b.expiresAt.getTime() > now.getTime();
  return {
    ...snapshot,
    id: b.id,
    status: b.status === 'PREVIEW' && !isLivePreview ? 'EXPIRED' : b.status,
    fileName: b.fileName,
    fileHash: b.fileHash,
    sameAsBatch: sameAs && sameAs.id !== b.id ? { id: sameAs.id, committedAt: sameAs.committedAt.toISOString() } : null,
    createdAt: b.createdAt.toISOString(),
    expiresAt: b.expiresAt.toISOString(),
    committedAt: b.committedAt?.toISOString() ?? null,
    canCommit: isLivePreview && b.errorCount === 0,
    issues,
  };
}

/** Read a batch as a preview DTO (US-02-03). */
export class GetImport {
  constructor(private readonly deps: { readonly batches: ImportBatchRepository; readonly clock: Clock }) {}

  async execute(id: string): Promise<Result<ImportPreviewDto, 'NOT_FOUND'>> {
    const batch = await this.deps.batches.findById(id);
    if (!batch) return err('NOT_FOUND');
    const [issues, sameAs] = await Promise.all([
      this.deps.batches.issuesFor(id),
      this.deps.batches.lastCommittedWithHash(batch.fileHash),
    ]);
    const issueDtos = issues.map(({ id: _id, ...rest }) => rest);
    return ok(toPreviewDto(batch, issueDtos, sameAs, this.deps.clock.now()));
  }
}
