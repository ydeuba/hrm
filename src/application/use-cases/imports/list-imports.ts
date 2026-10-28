import type { BatchStatus, ImportBatchRecord, ImportBatchRepository, ImportStateLoader } from '@/application/ports/imports';
import type { Clock } from '@/application/ports/clock';
import type { SettingsRepository } from '@/application/ports/settings';
import type { PreviewSnapshot } from './preview-dto';

export interface ImportBatchSummaryDto {
  readonly id: string;
  readonly status: BatchStatus;
  readonly fileName: string;
  readonly createdAt: string;
  readonly committedAt: string | null;
  readonly actorEmail: string;
  readonly sprints: { readonly from: string | null; readonly to: string | null };
  readonly summary: PreviewSnapshot['summary'];
  readonly hasOriginal: boolean;
  /** Why the original is gone (US-09-05 AC-2); null while it is kept. */
  readonly originalRemovedReason: string | null;
  /** True only for the latest committed batch while no later score change exists (US-02-09 AC-3). */
  readonly canRollback: boolean;
}

const DAY_MS = 86_400_000;

/** Originals are only removed by retention (old enough) or by a privacy erasure (ADR-017). */
function removedReason(b: ImportBatchRecord, now: Date, retentionDays: number | null): string | null {
  if (b.fileKey !== null) return null;
  if (retentionDays !== null && now.getTime() - b.createdAt.getTime() > retentionDays * DAY_MS) return `Original deleted after the ${retentionDays}-day retention period`;
  return 'Original deleted by a privacy erasure';
}

export function toSummaryDto(b: ImportBatchRecord, now: Date, scoreRevision = -1, retentionDays: number | null = null): ImportBatchSummaryDto {
  const expired = b.status === 'PREVIEW' && b.expiresAt.getTime() <= now.getTime();
  return {
    id: b.id,
    status: expired ? 'EXPIRED' : b.status,
    fileName: b.fileName,
    createdAt: b.createdAt.toISOString(),
    committedAt: b.committedAt?.toISOString() ?? null,
    actorEmail: b.actorEmail,
    sprints: { from: b.sprints[0] ?? null, to: b.sprints.at(-1) ?? null },
    summary: (b.summary as PreviewSnapshot).summary,
    hasOriginal: b.fileKey !== null,
    originalRemovedReason: removedReason(b, now, retentionDays),
    canRollback: b.status === 'COMMITTED' && b.commitRevision === scoreRevision,
  };
}

/** Import history, newest first (US-02-09). */
export class ListImports {
  constructor(private readonly deps: { readonly batches: ImportBatchRepository; readonly state: ImportStateLoader; readonly settings: SettingsRepository; readonly clock: Clock }) {}

  async execute(page: { cursor?: string; limit: number }): Promise<{ items: ImportBatchSummaryDto[]; nextCursor: string | null }> {
    const now = this.deps.clock.now();
    const [res, revision, settings] = await Promise.all([this.deps.batches.list(page), this.deps.state.scoreRevision(), this.deps.settings.get()]);
    return { items: res.items.map((b) => toSummaryDto(b, now, revision, settings.uploadRetentionDays)), nextCursor: res.nextCursor };
  }
}
