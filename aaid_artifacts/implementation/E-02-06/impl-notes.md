# E-02-06 — Data-quality warnings · Implementation record

## Shared implementation
- Domain: `src/domain/kpi/dashboard.ts` (`computeDashboard`, `toRows`, `moversOf`, `filterOptions`): pure, browser-safe, 100% branch coverage.
- UI: `src/app/(app)/dashboard/page.tsx` (server: dataset for the URL sprint range), `src/components/dashboard/*` (DashboardClient, FilterBar, StatCards, EngineerTable, DataCheckBanner, band pill and delta), `src/components/charts/*` (ChartPanel with table toggle; Chart.js charts), `src/components/employees/engineer-profile-modal.tsx`.
- Tests: `tests/unit/domain/kpi/dashboard.test.ts`, `tests/e2e/kpi-dashboard.spec.ts` (6 tests incl. axe), `tests/integration/app/kpi-dataset*.test.ts`.

## Acceptance criteria status
- [x] AC-1: satisfied — AVG_MISMATCH (> 0.02) with name, sheet value and computed value (`src/domain/import/data-check.ts`).
- [x] AC-2: satisfied — TOTAL_MISMATCH (> 0.05).
- [x] AC-3: satisfied — the sample gives 0 mismatches; one edited Average or Total gives exactly one warning each.
- [x] AC-4: satisfied — warnings are stored as ImportIssue rows with the batch, never block commit, and feed the dashboard banner until the next import.
