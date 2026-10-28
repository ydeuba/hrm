# E-09-04 — Restore procedure & verification test · Implementation record

## Implementation
- README "Restoring a backup" section; `tests/integration/app/backup.test.ts`.

## Acceptance criteria status
- [x] AC-1: satisfied — the README documents: stop the app → unzip into DATA_DIR → prisma migrate deploy → start.
- [x] AC-2: satisfied — the integration test extracts hrm.db into a temporary directory and checks that row counts for 9 tables equal the source.
