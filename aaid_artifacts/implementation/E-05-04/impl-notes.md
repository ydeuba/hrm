# E-05-04 — Momentum "biggest movers" chart · Implementation record

## Shared implementation
- Domain: `src/domain/kpi/dashboard.ts` (`computeDashboard`, `toRows`, `moversOf`, `filterOptions`): pure, browser-safe, 100% branch coverage.
- UI: `src/app/(app)/dashboard/page.tsx` (server: dataset for the URL sprint range), `src/components/dashboard/*` (DashboardClient, FilterBar, StatCards, EngineerTable, DataCheckBanner, band pill and delta), `src/components/charts/*` (ChartPanel with table toggle; Chart.js charts), `src/components/employees/engineer-profile-modal.tsx`.
- Tests: `tests/unit/domain/kpi/dashboard.test.ts`, `tests/e2e/kpi-dashboard.spec.ts` (6 tests incl. axe), `tests/integration/app/kpi-dataset*.test.ts`.

## Acceptance criteria status
- [x] AC-1: satisfied — top 7 and bottom 7 when more than 14 are eligible, otherwise all (unit).
- [x] AC-2: satisfied — green ≥ 0 / red < 0 bars; the tooltip shows "+x.xx (prior → last)"; the table view shows a signed change.
- [x] AC-3: satisfied — empty state: "No engineer in this view has 6+ scored sprints to compare."
