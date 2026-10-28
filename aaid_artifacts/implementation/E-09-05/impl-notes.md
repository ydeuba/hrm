# E-09-05 — Upload retention purge · Implementation record

## Implementation
- ImportBatchRepository.purgeOriginals(cutoff), run by PreviewImport after the new batch is stored, so shared content-hash keys survive; ListImports.originalRemovedReason; history row shows the reason.
- Tests: `tests/integration/app/retention.test.ts`.

## Acceptance criteria status
- [x] AC-1: satisfied — on the next upload, originals older than uploadRetentionDays (default 90) are deleted, and fileKey and parsed are cleared; the summary is kept. 89 days is kept, 91 is purged.
- [x] AC-2: satisfied — the history shows a struck-through "Download original" with the reason ("deleted after the 90-day retention period" or "by a privacy erasure").
