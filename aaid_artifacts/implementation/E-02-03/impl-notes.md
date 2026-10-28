# E-02-03 — Cell parsing & row validation · Implementation record

## Files
- `src/domain/import/cell-parser.ts` (`parseCell`, `parseOptionalNumber`).
- `src/domain/import/master-sheet.ts` (row parsing, section-row skip, duplicate detection, empty-sprint drop).
- `src/domain/import/issues.ts` (issue codes).

## Notes
- A sprint column whose cells are all RUN, N/A or blank is treated as empty and dropped, so it can't clear stored scores. This follows US-02-02 AC-5 ("columns with no numeric score are not created as sprints").
- When the file has a Code column, duplicates are judged by code; otherwise by normalised name.

## Acceptance criteria status
- [x] AC-1: satisfied — `RUN` → RUN; `N/A`/`NA`/`-`/blank/`#…` errors → not scored; 0–10 → centi half-up; `5.975` → 598 with `PRECISION_ROUNDED` (exactly one such warning in the sample, row 44 S122).
- [x] AC-2: satisfied — out-of-range values (`OUT_OF_RANGE`) and non-numeric text (`NON_NUMERIC`) are errors with row and column; `hasErrors` drives `canCommit=false` in the preview.
- [x] AC-3: satisfied — the TEAM LEAD/SSE/SE/ASE/QA/BA/LEAD section rows and rows missing a name or designation are skipped (49 employees parsed from the sample).
- [x] AC-4: satisfied — duplicate normalised names raise `DUPLICATE_NAME` ("Asha  Rai" / "asha rai").
