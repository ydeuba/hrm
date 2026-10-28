# E-06-03 — Rankings page · Implementation record

## Shared implementation
- Application: `use-cases/kpi/kpi-population.ts` (active engineers + metrics over a sprint range), `get-rankings.ts`, `get-group-summaries.ts`, `get-engineer-profile.ts`; port `ports/employees.ts`; adapter `prisma-employee-repository.ts`.
- API: `GET /api/v1/kpi/rankings?scope`, `GET /api/v1/kpi/summaries`, `GET /api/v1/employees/{id}/profile`.
- UI: `/rankings?tab=overall|designation|lastN|summaries`, `/employees/[id]`, `components/rankings/ranking-table.tsx`, `components/employees/{engineer-trend-chart,profile-stats}.tsx` (shared with the dashboard modal).
- Tests: `tests/integration/app/rankings-profile.test.ts` (golden vs workbook), `tests/e2e/rankings.spec.ts` (incl. axe).

## Acceptance criteria status
- [x] AC-1: satisfied — the Overall tab lists engineers in rank order; ranks match the workbook for all 49 (integration).
- [x] AC-2: satisfied — the By-designation tab shows one table per designation (Team Lead, SSE, SE, ASE) with ranks restarting at 1.
- [x] AC-3: satisfied — the Last-N tab shows the window "S133–S138"; averages, counts and ranks match the last-6 block / Sheet1 for all 49.
- [x] AC-4: satisfied — engineers below the eligibility threshold appear in a separate "Not yet eligible" list (tested with min 5).
