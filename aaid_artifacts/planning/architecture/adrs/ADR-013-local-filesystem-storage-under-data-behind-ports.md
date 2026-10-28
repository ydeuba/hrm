# ADR-013: Local filesystem storage under `./data` behind ports

_Source of truth: [architecture.md](../architecture.md) — extracted 2026-10-15._

- **Status**: Accepted
- **Context**: Uploaded originals must be kept for audit, rollback evidence and backup (US-09-02), outside the web root (NFR-10).
- **Decision**: `DATA_DIR` (default `./data`, git-ignored) contains `hrm.db`, `uploads/<sha256>.<ext>` and `backups/`. Access goes through the `FileStore` port (`LocalFileStore`). Backup uses `BackupProvider` (`SqliteBackupProvider`: `VACUUM INTO` a temporary file, then zip it with the uploads using `archiver`, streamed to the response).
- **Consequences**: Simple and portable; the whole state lives in one folder. On a future server, `DATA_DIR` must be a persistent volume. A PostgreSQL backup provider (`pg_dump`) is a later task.
