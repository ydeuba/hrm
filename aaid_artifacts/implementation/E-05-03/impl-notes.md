# E-05-03 — Group & trend charts · Implementation record

## Shared implementation
- Domain: `src/domain/kpi/dashboard.ts` (`computeDashboard`, `toRows`, `moversOf`, `filterOptions`): pure, browser-safe, 100% branch coverage.
- UI: `src/app/(app)/dashboard/page.tsx` (server: dataset for the URL sprint range), `src/components/dashboard/*` (DashboardClient, FilterBar, StatCards, EngineerTable, DataCheckBanner, band pill and delta), `src/components/charts/*` (ChartPanel with table toggle; Chart.js charts), `src/components/employees/engineer-profile-modal.tsx`.
- Tests: `tests/unit/domain/kpi/dashboard.test.ts`, `tests/e2e/kpi-dashboard.spec.ts` (6 tests incl. axe), `tests/integration/app/kpi-dataset*.test.ts`.

## Acceptance criteria status
- [x] AC-1: satisfied — designation (Team Lead/SSE/SE/ASE order) and team bars on a 0–10 scale; tooltips show headcount.
- [x] AC-2: satisfied — the trend chart shows gaps (null) for sprints with no scores; tooltips show participants.
- [x] AC-3: satisfied — each chart has an sr-only summary, a role=img wrapper and a "Show as table" toggle; canvases are aria-hidden (axe clean).
- [x] AC-4: satisfied — the chart data comes from computeDashboard, whose groups and trend equal the E-04-04 golden figures.
