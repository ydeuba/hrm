# E-07-02 — Export engineer table to Excel/CSV · Implementation record

## Implementation
- Application: `use-cases/exports/export-use-cases.ts` (ExportKpi.engineers reuses computeDashboard so rows match the dashboard).
- Infrastructure: `excel/sheetjs-writer.ts` (escapeCell, CSV with BOM).
- API: `GET /api/v1/exports/engineers`. UI: "Export Excel" / "Export CSV" on the dashboard.
- Tests: `tests/unit/infrastructure/sheetjs-writer.test.ts`, `tests/integration/app/exports.test.ts`, plus an e2e download test.

## Acceptance criteria status
- [x] AC-1: satisfied — the rows match the dashboard filters (integration test: team filter); one column per sprint, with RUN and N/A as text.
- [x] AC-2: satisfied — text starting with = + - @ tab or CR is prefixed with an apostrophe (unit test; no cell becomes a formula).
- [x] AC-3: satisfied — filename `cloudtech-kpi_<from>-<to>_<yyyymmdd>.xlsx`; `format=csv` returns UTF-8 with a BOM.
