# E-02-02 — Sheet & header detection · Implementation record

## Files
- `src/domain/import/header-locator.ts` (`locateHeader`): first row within 10 that has Designation, a name column (Resources / Name / Employee Name) and ≥1 `S###`; optional Teams, Total, Average and Code columns; case- and whitespace-insensitive; first occurrence wins.
- `src/domain/import/master-sheet.ts` (`chooseSheet`, `interpretMasterSheet`).
- `src/application/ports/spreadsheet.ts` + `src/infrastructure/excel/sheetjs-reader.ts`: cached values only; CSV is read as text (BOM stripped).
- Tests: `tests/unit/domain/import/master-sheet.test.ts` (real workbook + synthetic grids).

## Acceptance criteria status
- [x] AC-1: satisfied — the sample picks `"Compile Sheet "`, header row 1, sprints S122–S138; S139–S141 are reported as empty and ignored.
- [x] AC-2: satisfied — without a Compile Sheet, the first sheet with a valid header is used and its name is returned.
- [x] AC-3: satisfied — no header in the first 10 rows → `IMPORT_NO_HEADER` (mapped to 400 by the preview endpoint, E-02-05).
- [x] AC-4: satisfied — an optional Code / Employee Code column is mapped; ranking blocks, the helper columns and the other sheets are ignored (first-occurrence column matching; only the chosen sheet is read).
