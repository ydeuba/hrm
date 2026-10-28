import type { CurrentState, ImportDiff } from '@/domain/import/diff';
import type { ImportIssueDraft } from '@/domain/import/issues';
import type { ParsedMasterSheet } from '@/domain/import/master-sheet';
import type { SprintCode } from '@/domain/kpi/sprint-code';
import type { Result } from '@/domain/shared/result';

export type BatchStatus = 'PREVIEW' | 'COMMITTED' | 'ROLLED_BACK' | 'DISCARDED' | 'EXPIRED';

export interface ImportBatchRecord {
  readonly id: string;
  readonly fileName: string;
  readonly fileHash: string;
  readonly fileKey: string | null;
  readonly fileSize: number;
  readonly status: BatchStatus;
  readonly baseRevision: number;
  readonly commitRevision: number | null;
  readonly sheetName: string;
  readonly headerRow: number;
  readonly sprints: readonly SprintCode[];
  readonly parsed: ParsedMasterSheet | null;
  /** Preview snapshot (ImportPreviewDto body without volatile fields). */
  readonly summary: unknown;
  readonly actorId: string;
  readonly actorEmail: string;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly committedAt: Date | null;
  readonly rolledBackAt: Date | null;
  readonly errorCount: number;
  readonly warningCount: number;
}

export interface NewPreviewBatch {
  readonly fileName: string;
  readonly fileHash: string;
  readonly fileKey: string;
  readonly fileSize: number;
  readonly baseRevision: number;
  readonly sheet: ParsedMasterSheet;
  readonly summary: unknown;
  readonly actorId: string;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly issues: readonly ImportIssueDraft[];
}

export interface ImportIssueRecord extends ImportIssueDraft {
  readonly id: string;
}

export interface ImportBatchRepository {
  createPreview(batch: NewPreviewBatch): Promise<string>;
  findById(id: string): Promise<ImportBatchRecord | null>;
  issuesFor(batchId: string): Promise<ImportIssueRecord[]>;
  setStatus(id: string, status: Extract<BatchStatus, 'DISCARDED' | 'EXPIRED'>): Promise<void>;
  /** Mark PREVIEW batches past their expiry as EXPIRED; returns how many. */
  expirePreviews(now: Date): Promise<number>;
  lastCommittedWithHash(fileHash: string): Promise<{ id: string; committedAt: Date } | null>;
  latestCommitted(): Promise<ImportBatchRecord | null>;
  /** Cheap reference to the latest committed batch (no JSON payloads). */
  latestCommittedRef(): Promise<{ id: string; fileName: string; committedAt: Date } | null>;
  list(page: { cursor?: string; limit: number }): Promise<{ items: ImportBatchRecord[]; nextCursor: string | null }>;
  /**
   * Retention (US-09-05): drop the stored original of batches created before
   * `cutoff`, keeping summary metadata. Returns storage keys that no remaining
   * batch references (safe to delete; keys are content hashes and can be shared).
   */
  purgeOriginals(cutoff: Date): Promise<string[]>;
}

export interface ImportStateLoader {
  /** Current employees, label aliases, sprints and the scores for the given sprints. */
  load(sprints: readonly SprintCode[]): Promise<CurrentState>;
  scoreRevision(): Promise<number>;
}

export interface CommitRequest {
  readonly batchId: string;
  readonly baseRevision: number;
  readonly sheet: ParsedMasterSheet;
  readonly diff: ImportDiff;
  readonly actorId: string;
  readonly now: Date;
}

export interface CommitOutcome {
  readonly commitRevision: number;
}

/** Applies a diff atomically with a journal and audit row (ADR-007). */
export interface ImportCommitter {
  commit(request: CommitRequest): Promise<Result<CommitOutcome, 'CONFLICT_STALE_PREVIEW'>>;
}
