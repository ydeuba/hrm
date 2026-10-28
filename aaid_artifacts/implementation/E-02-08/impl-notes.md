# E-02-08 — Roll back latest import · Implementation record

## Files
`src/application/use-cases/imports/rollback-import.ts`, `src/infrastructure/db/repositories/prisma-import-rollbacker.ts` (replays the ImportChange journal in reverse in one transaction behind the conditional `scoreRevision` guard; `IMPORT_ROLLBACK` audit in the same transaction), `POST /api/v1/imports/{id}/rollback`, the history Roll back button with a confirm dialog (`components/import/history-actions.tsx`, `components/ui/confirm-dialog.tsx`).

## Acceptance criteria status
- [x] AC-1: satisfied — every journalled change is reversed (created scores, employees, aliases, sprints and teams deleted; updated scores and employees restored) and the batch becomes ROLLED_BACK.
- [x] AC-2: satisfied — a later score change → 409 `CONFLICT_LATER_CHANGES`; a settings change alone keeps rollback available (separate `settingsRevision`).
- [x] AC-3: satisfied — a batch that isn't the latest → 409 `NOT_LATEST`.
- [x] AC-4: satisfied — import A → import B (changed score, new person, new sprint, new team) → roll back B gives a database snapshot identical to the one after A (employees, teams, sprints, scores incl. `sourceBatchId`, aliases).
