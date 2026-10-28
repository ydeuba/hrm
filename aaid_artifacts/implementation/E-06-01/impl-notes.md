# E-06-01 — Engineer profile modal · Implementation record

## Shared implementation
- Domain: `src/domain/kpi/dashboard.ts` (`computeDashboard`, `toRows`, `moversOf`, `filterOptions`): pure, browser-safe, 100% branch coverage.
- UI: `src/app/(app)/dashboard/page.tsx` (server: dataset for the URL sprint range), `src/components/dashboard/*` (DashboardClient, FilterBar, StatCards, EngineerTable, DataCheckBanner, band pill and delta), `src/components/charts/*` (ChartPanel with table toggle; Chart.js charts), `src/components/employees/engineer-profile-modal.tsx`.
- Tests: `tests/unit/domain/kpi/dashboard.test.ts`, `tests/e2e/kpi-dashboard.spec.ts` (6 tests incl. axe), `tests/integration/app/kpi-dataset*.test.ts`.

## Acceptance criteria status
- [x] AC-1: satisfied — name, designation, team, "overall rank X of N", designation rank, average, total, sprints, rating, last 3, momentum, best/worst, variability, RUN count.
- [x] AC-2: satisfied — the engineer line has gaps for RUN and N/A; a dashed org-average line is shown.
- [x] AC-3: satisfied — native <dialog> traps focus, Esc and the × button close it, and focus returns to the row (e2e).
