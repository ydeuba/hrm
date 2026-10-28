# E-05-01 — KPI summary cards · Implementation record

## Shared implementation
- Domain: `src/domain/kpi/dashboard.ts` (`computeDashboard`, `toRows`, `moversOf`, `filterOptions`): pure, browser-safe, 100% branch coverage.
- UI: `src/app/(app)/dashboard/page.tsx` (server: dataset for the URL sprint range), `src/components/dashboard/*` (DashboardClient, FilterBar, StatCards, EngineerTable, DataCheckBanner, band pill and delta), `src/components/charts/*` (ChartPanel with table toggle; Chart.js charts), `src/components/employees/engineer-profile-modal.tsx`.
- Tests: `tests/unit/domain/kpi/dashboard.test.ts`, `tests/e2e/kpi-dashboard.spec.ts` (6 tests incl. axe), `tests/integration/app/kpi-dataset*.test.ts`.

## Acceptance criteria status
- [x] AC-1: satisfied — the cards show engineers, weighted org average, latest-sprint average + participants, coverage %, and count + % per band.
- [x] AC-2: satisfied — each card accent follows its band, and band cards carry the band name and threshold as text.
- [x] AC-3: satisfied — e2e asserts 49 engineers, S138 average 8.41, coverage 95.9%, org average 7.78 on the sample.
