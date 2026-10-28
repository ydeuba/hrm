# E-06-04 — Team & designation summaries with Top-N · Implementation record

## Shared implementation
- Application: `use-cases/kpi/kpi-population.ts` (active engineers + metrics over a sprint range), `get-rankings.ts`, `get-group-summaries.ts`, `get-engineer-profile.ts`; port `ports/employees.ts`; adapter `prisma-employee-repository.ts`.
- API: `GET /api/v1/kpi/rankings?scope`, `GET /api/v1/kpi/summaries`, `GET /api/v1/employees/{id}/profile`.
- UI: `/rankings?tab=overall|designation|lastN|summaries`, `/employees/[id]`, `components/rankings/ranking-table.tsx`, `components/employees/{engineer-trend-chart,profile-stats}.tsx` (shared with the dashboard modal).
- Tests: `tests/integration/app/rankings-profile.test.ts` (golden vs workbook), `tests/e2e/rankings.spec.ts` (incl. axe).

## Acceptance criteria status
- [x] AC-1: satisfied — team table (people, score observations, total, weighted average, rank) and designation table (people, observations, weighted average) equal Performance Insights.
- [x] AC-2: satisfied — the Top 10 with ≥ 5 sprints matches Performance Insights rows 21–30 (names and sprint counts).
- [x] AC-3: satisfied — the headline shows resources, overall average, latest sprint, latest average and coverage.
