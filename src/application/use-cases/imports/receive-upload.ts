import { validateUpload, type UploadKind, type UploadLimits, type UploadRejection } from '@/domain/import/upload-policy';
import { err, ok, type Result } from '@/domain/shared/result';
import type { ContentHasher, FileStore } from '@/application/ports/file-store';

export interface StoredUpload {
  readonly fileName: string;
  readonly fileHash: string;
  readonly fileKey: string;
  readonly size: number;
  readonly kind: UploadKind;
}

/**
 * Validate an uploaded master sheet and store the original, content-addressed
 * by SHA-256 (US-02-01). Identical files map to the same key.
 */
export class ReceiveUpload {
  constructor(
    private readonly deps: { readonly files: FileStore; readonly hasher: ContentHasher; readonly limits: UploadLimits },
  ) {}

  async execute(input: { readonly fileName: string; readonly bytes: Uint8Array }): Promise<Result<StoredUpload, UploadRejection>> {
    const fileName = input.fileName.replace(/[\\/]/g, '_').slice(0, 255);
    const kind = validateUpload(fileName, input.bytes, this.deps.limits);
    if (!kind.ok) return err(kind.error);
    const fileHash = this.deps.hasher.sha256(input.bytes);
    const fileKey = `uploads/${fileHash}.${kind.value}`;
    await this.deps.files.put(fileKey, input.bytes);
    return ok({ fileName, fileHash, fileKey, size: input.bytes.length, kind: kind.value });
  }
}
