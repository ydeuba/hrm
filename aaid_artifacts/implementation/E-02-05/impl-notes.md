# E-02-05 — Import preview screen · Implementation record

## Files
- Application:
  - `use-cases/imports/preview-import.ts`: upload → interpret → data-check → diff → PREVIEW batch + issues + `IMPORT_PREVIEW` audit; lazily expires old previews.
  - `get-import.ts`, `list-imports.ts`, `discard-import.ts`, `preview-dto.ts`.
  - `ports/imports.ts`, `ports/settings.ts`, `contracts/settings.ts`.
- Infrastructure: `prisma-import-batch-repository.ts`, `prisma-import-state-loader.ts` (one query per table), `prisma-settings-repository.ts`, `excel/sheetjs-reader.ts`.
- API: `POST /api/v1/imports` (→ 201 preview DTO), `GET /api/v1/imports`, `GET|DELETE /api/v1/imports/{id}`.
- UI:
  - `/imports` (dropzone + history), `/imports/[id]` (summary, near-duplicate checkboxes, 5 tabs with arrow-key navigation, Discard / Confirm);
  - components `import/upload-dropzone.tsx`, `import/import-preview.tsx`, `ui/button.tsx`, `ui/alert.tsx`, `format.ts`.
- Tests: `tests/integration/app/import-flow.test.ts`, `tests/e2e/import.spec.ts`.

## Notes
- The preview snapshot (lists of new employees, changes and score changes) is stored in `ImportBatch.summary`, so the preview is stable while you review it. The commit recomputes the diff and is protected by the revision guard.
- After a commit the page navigates to `/dashboard?imported=<id>`; the dashboard confirmation lands with E-05.

## Acceptance criteria status
- [x] AC-1: satisfied — the preview shows the sheet used, the sprint range, summary counts and the New / Changes / Scores / Warnings / Errors tabs (integration + e2e).
- [x] AC-2: satisfied — each near-duplicate has a "Same person" checkbox, and unticked ones are labelled "will be created as new"; confirmed pairs add a MERGE alias (integration).
- [x] AC-3: satisfied — with errors, Confirm is disabled and the errors list row and column; with warnings only, Confirm is enabled (integration: `canCommit=false` + 422; e2e: Confirm enabled with 1 warning).
- [x] AC-4: satisfied — Discard → DISCARDED (204) and returns to `/imports`; previews older than 30 minutes show "expired" (410 on commit, `status: EXPIRED`).
- [x] AC-5: satisfied — re-uploading an identical file shows "This file was already imported on <date>" (integration + e2e).
