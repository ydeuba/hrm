# E-06-02 — Profile page & score table · Implementation record

## Shared implementation
- Application: `use-cases/kpi/kpi-population.ts` (active engineers + metrics over a sprint range), `get-rankings.ts`, `get-group-summaries.ts`, `get-engineer-profile.ts`; port `ports/employees.ts`; adapter `prisma-employee-repository.ts`.
- API: `GET /api/v1/kpi/rankings?scope`, `GET /api/v1/kpi/summaries`, `GET /api/v1/employees/{id}/profile`.
- UI: `/rankings?tab=overall|designation|lastN|summaries`, `/employees/[id]`, `components/rankings/ranking-table.tsx`, `components/employees/{engineer-trend-chart,profile-stats}.tsx` (shared with the dashboard modal).
- Tests: `tests/integration/app/rankings-profile.test.ts` (golden vs workbook), `tests/e2e/rankings.spec.ts` (incl. axe).

## Acceptance criteria status
- [x] AC-1: satisfied — `/employees/[id]` renders the profile as a full page (breadcrumb, ranks, stats, trend vs org average); the modal links to it.
- [x] AC-2: satisfied — the score table lists every sprint with its value, "RUN", "N/A" or — (not stored), plus the source import file linking to its batch.
- [x] AC-3: satisfied — an unknown id → 404 page (e2e) / API 404 (integration).
