/** Produces a backup archive: a consistent DB snapshot plus the uploaded files (ADR-013). */
export interface BackupArchiver {
  create(): Promise<{ readonly bytes: Uint8Array; readonly files: number }>;
}
