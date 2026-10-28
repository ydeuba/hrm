import { extensionOf } from '@/domain/import/upload-policy';
import { err, ok, type Result } from '@/domain/shared/result';
import type { FileStore } from '@/application/ports/file-store';
import type { ImportBatchRepository } from '@/application/ports/imports';

/** Original uploaded bytes for a batch, if still retained (US-02-09 AC-2). */
export class GetImportFile {
  constructor(private readonly deps: { readonly batches: ImportBatchRepository; readonly files: FileStore }) {}

  async execute(id: string): Promise<Result<{ bytes: Uint8Array; fileName: string; kind: string }, 'NOT_FOUND' | 'REMOVED'>> {
    const batch = await this.deps.batches.findById(id);
    if (!batch) return err('NOT_FOUND');
    const bytes = batch.fileKey ? await this.deps.files.get(batch.fileKey) : null;
    if (!bytes) return err('REMOVED');
    return ok({ bytes, fileName: batch.fileName, kind: extensionOf(batch.fileKey ?? '') });
  }
}
