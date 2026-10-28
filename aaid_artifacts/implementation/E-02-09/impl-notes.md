# E-02-09 — Import history & original-file download · Implementation record

## Files
`/imports` history table (date, file, sprints, status, uploader, score counts, actions), `ListImports` with `canRollback` and `hasOriginal`, `GetImportFile` + `GET /api/v1/imports/{id}/file`.

## Acceptance criteria status
- [x] AC-1: satisfied — history lists date, file name, status, uploader and summary counts, newest first, with cursor pagination (`?limit&cursor`).
- [x] AC-2: satisfied — "Download original" returns the exact uploaded bytes (byte-equal test). When the original was removed (retention or erasure) the link becomes "Original removed" and the API answers 410.
- [x] AC-3: satisfied — the Roll back button appears only where `canRollback` is true (latest committed batch with no later score change).
