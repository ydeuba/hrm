# E-05-02 — Filters with bookmarkable state · Implementation record

## Shared implementation
- Domain: `src/domain/kpi/dashboard.ts` (`computeDashboard`, `toRows`, `moversOf`, `filterOptions`): pure, browser-safe, 100% branch coverage.
- UI: `src/app/(app)/dashboard/page.tsx` (server: dataset for the URL sprint range), `src/components/dashboard/*` (DashboardClient, FilterBar, StatCards, EngineerTable, DataCheckBanner, band pill and delta), `src/components/charts/*` (ChartPanel with table toggle; Chart.js charts), `src/components/employees/engineer-profile-modal.tsx`.
- Tests: `tests/unit/domain/kpi/dashboard.test.ts`, `tests/e2e/kpi-dashboard.spec.ts` (6 tests incl. axe), `tests/integration/app/kpi-dataset*.test.ts`.

## Acceptance criteria status
- [x] AC-1: satisfied — designation, team, rating, coverage and name combine with AND (unit + e2e: DevOps → 7, + SE → 2).
- [x] AC-2: satisfied — filters live in the URL (History API, no server round trip); a reload keeps the same view (e2e).
- [x] AC-3: satisfied — Reset clears all filters (disabled when already at the default).
- [x] AC-4: satisfied — changing the sprint range re-fetches the dataset via the server page (e2e: From S133 → "Sprints S133–S138 (6)"); other filters run client-side only.
