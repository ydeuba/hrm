# E-09-03 — Backup download · Implementation record

## Implementation
- Application: `use-cases/backup/create-backup.ts`, port `ports/backup.ts`.
- Infrastructure: `backup/sqlite-backup-archiver.ts` (VACUUM INTO a temporary file, then the uploads) and `files/zip-writer.ts` (a dependency-free deflate zip writer using node:zlib crc32).
- API: `POST /api/v1/backups` (POST so the Origin check applies). UI: Settings → Backup → "Download backup".

## Acceptance criteria status
- [x] AC-1: satisfied — `hrm-backup_<yyyymmdd-HHmm>.zip` (Asia/Kathmandu time) with hrm.db and uploads/ (integration and e2e tests).
- [x] AC-2: satisfied — VACUUM INTO runs in a single read transaction, so the snapshot holds either all of an in-flight commit or none of it (SQLite guarantee).
- [x] AC-3: satisfied — BACKUP_CREATE is audited with the file name, size and upload count.
