# E-05-05 — Sortable engineer table · Implementation record

## Shared implementation
- Domain: `src/domain/kpi/dashboard.ts` (`computeDashboard`, `toRows`, `moversOf`, `filterOptions`): pure, browser-safe, 100% branch coverage.
- UI: `src/app/(app)/dashboard/page.tsx` (server: dataset for the URL sprint range), `src/components/dashboard/*` (DashboardClient, FilterBar, StatCards, EngineerTable, DataCheckBanner, band pill and delta), `src/components/charts/*` (ChartPanel with table toggle; Chart.js charts), `src/components/employees/engineer-profile-modal.tsx`.
- Tests: `tests/unit/domain/kpi/dashboard.test.ts`, `tests/e2e/kpi-dashboard.spec.ts` (6 tests incl. axe), `tests/integration/app/kpi-dataset*.test.ts`.

## Acceptance criteria status
- [x] AC-1: satisfied — Rank, Name, Team, Designation, Sprints, Total, Avg, Last 3, Momentum, Rating.
- [x] AC-2: satisfied — header buttons toggle the sort with aria-sort; nulls always last; text and rank ascend first, numbers descend first (e2e: Avg desc → Dilendra first).
- [x] AC-3: satisfied — rows are focusable; Enter opens the profile dialog (preventDefault stops the same keystroke closing it).
- [x] AC-4: satisfied — when adjacent rows show the same 2-dp average but different ranks, the average cell gets a 3-dp tooltip.
