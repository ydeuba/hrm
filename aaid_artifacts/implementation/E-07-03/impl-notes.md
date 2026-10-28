# E-07-03 — Export rankings workbook · Implementation record

## Implementation
- ExportKpi.rankings plus `GET /api/v1/exports/rankings`; "Export workbook" on the Rankings page.

## Acceptance criteria status
- [x] AC-1: satisfied — sheets Overall, By designation and Last N sprints, built from the same GetRankings use case as the page.
- [x] AC-2: satisfied — the same SheetJsWriter escaping applies.
