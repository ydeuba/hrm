# E-05-06 — Data-check banner & empty state · Implementation record

## Shared implementation
- Domain: `src/domain/kpi/dashboard.ts` (`computeDashboard`, `toRows`, `moversOf`, `filterOptions`): pure, browser-safe, 100% branch coverage.
- UI: `src/app/(app)/dashboard/page.tsx` (server: dataset for the URL sprint range), `src/components/dashboard/*` (DashboardClient, FilterBar, StatCards, EngineerTable, DataCheckBanner, band pill and delta), `src/components/charts/*` (ChartPanel with table toggle; Chart.js charts), `src/components/employees/engineer-profile-modal.tsx`.
- Tests: `tests/unit/domain/kpi/dashboard.test.ts`, `tests/e2e/kpi-dashboard.spec.ts` (6 tests incl. axe), `tests/integration/app/kpi-dataset*.test.ts`.

## Acceptance criteria status
- [x] AC-1: satisfied — a dismissible banner lists the count and the first 3 AVG/TOTAL mismatches from the latest committed import, with a Details link (integration: dataCheck payload).
- [x] AC-2: satisfied — with no data the page shows the "Upload your KPI master sheet" CTA to /imports. Fixed: an empty DB returned INVALID_RANGE (integration test added).
- [x] AC-3: satisfied — the header line shows the sprint range, engineer count, last import time (Asia/Kathmandu) and the band legend.
