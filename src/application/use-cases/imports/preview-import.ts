import { dataCheckIssues } from '@/domain/import/data-check';
import { diffImport } from '@/domain/import/diff';
import { hasErrors, type ImportIssueDraft } from '@/domain/import/issues';
import { interpretMasterSheet } from '@/domain/import/master-sheet';
import type { UploadRejection } from '@/domain/import/upload-policy';
import { err, ok, type Result } from '@/domain/shared/result';
import type { AuditLog } from '@/application/ports/audit-log';
import type { Clock } from '@/application/ports/clock';
import type { FileStore } from '@/application/ports/file-store';
import type { ImportBatchRepository, ImportStateLoader } from '@/application/ports/imports';
import type { SettingsRepository } from '@/application/ports/settings';
import type { SpreadsheetReader } from '@/application/ports/spreadsheet';
import { buildSnapshot } from './preview-dto';
import type { ReceiveUpload } from './receive-upload';

export const PREVIEW_TTL_MS = 30 * 60_000;

export type PreviewError = UploadRejection | { readonly code: 'IMPORT_NO_HEADER'; readonly reason: string };

export interface PreviewImportDeps {
  readonly receiveUpload: ReceiveUpload;
  readonly reader: SpreadsheetReader;
  readonly batches: ImportBatchRepository;
  readonly state: ImportStateLoader;
  readonly settings: SettingsRepository;
  readonly audit: AuditLog;
  readonly clock: Clock;
  readonly files: FileStore;
}

/**
 * Upload → interpret → validate → diff → store a PREVIEW batch (US-02-03,
 * ADR-007 step 1). Nothing outside the batch and its issues is written.
 */
export class PreviewImport {
  constructor(private readonly deps: PreviewImportDeps) {}

  async execute(input: { fileName: string; bytes: Uint8Array; actorId: string }): Promise<Result<{ batchId: string }, PreviewError>> {
    const { deps } = this;
    const upload = await deps.receiveUpload.execute({ fileName: input.fileName, bytes: input.bytes });
    if (!upload.ok) return err(upload.error);
    const interpreted = interpretMasterSheet(deps.reader.read(input.bytes, upload.value.kind));
    if (!interpreted.ok) {
      return err({ code: 'IMPORT_NO_HEADER', reason: 'No header row found. The first 10 rows must contain "Resources", "Designation" and sprint columns such as S122.' });
    }
    const { sheet, issues: parseIssues } = interpreted.value;
    const settings = await deps.settings.get();
    const now = deps.clock.now();
    const baseRevision = await deps.state.scoreRevision();
    const current = await deps.state.load(sheet.sprints);
    const diff = diffImport(sheet, current, { notScoredOverwrites: settings.importNotScoredOverwrites, merges: new Map() });
    const issues: ImportIssueDraft[] = [
      ...parseIssues,
      ...dataCheckIssues(sheet, { average: settings.dataCheckTolerance, total: settings.totalCheckTolerance }),
      ...diff.issues,
    ];
    await deps.batches.expirePreviews(now);
    const batchId = await deps.batches.createPreview({
      fileName: upload.value.fileName,
      fileHash: upload.value.fileHash,
      fileKey: upload.value.fileKey,
      fileSize: upload.value.size,
      baseRevision,
      sheet,
      summary: buildSnapshot(sheet, diff, current.employees, issues),
      actorId: input.actorId,
      createdAt: now,
      expiresAt: new Date(now.getTime() + PREVIEW_TTL_MS),
      issues,
    });
    await deps.audit.record({
      actorId: input.actorId, action: 'IMPORT_PREVIEW', entity: 'ImportBatch', entityId: batchId,
      meta: { fileName: upload.value.fileName, fileHash: upload.value.fileHash, rows: sheet.rows.length, errors: hasErrors(issues) },
    });
    // Retention runs after the new batch exists, so a re-upload of an old file keeps its (shared) key.
    await purgeExpiredOriginals(deps, now, settings.uploadRetentionDays);
    return ok({ batchId });
  }
}

/** US-09-05: originals older than the retention period are deleted on the next upload. */
async function purgeExpiredOriginals(deps: PreviewImportDeps, now: Date, retentionDays: number): Promise<void> {
  const keys = await deps.batches.purgeOriginals(new Date(now.getTime() - retentionDays * 86_400_000));
  await Promise.all(keys.map((k) => deps.files.delete(k)));
}
