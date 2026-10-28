# E-04-06 — Sprint-range selection · Implementation record

## Shared implementation
- Domain: `src/domain/kpi/dashboard.ts` (`computeDashboard`, `toRows`, `moversOf`, `filterOptions`): pure, browser-safe, 100% branch coverage.
- UI: `src/app/(app)/dashboard/page.tsx` (server: dataset for the URL sprint range), `src/components/dashboard/*` (DashboardClient, FilterBar, StatCards, EngineerTable, DataCheckBanner, band pill and delta), `src/components/charts/*` (ChartPanel with table toggle; Chart.js charts), `src/components/employees/engineer-profile-modal.tsx`.
- Tests: `tests/unit/domain/kpi/dashboard.test.ts`, `tests/e2e/kpi-dashboard.spec.ts` (6 tests incl. axe), `tests/integration/app/kpi-dataset*.test.ts`.

## Acceptance criteria status
- [x] AC-1: satisfied — `from`/`to` limit metrics, ranks, trend and groups (integration: S130–S135 → 6 cells per engineer; UI From/To selects).
- [x] AC-2: satisfied — from > to or an unknown sprint → 400 VALIDATION_FAILED (API) and a friendly notice on the page.
- [x] AC-3: satisfied — no range = all sprints.
