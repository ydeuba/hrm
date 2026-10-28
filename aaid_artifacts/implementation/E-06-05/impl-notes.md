# E-06-05 — Auto-generated interpretation · Implementation record

## Shared implementation
- Application: `use-cases/kpi/kpi-population.ts` (active engineers + metrics over a sprint range), `get-rankings.ts`, `get-group-summaries.ts`, `get-engineer-profile.ts`; port `ports/employees.ts`; adapter `prisma-employee-repository.ts`.
- API: `GET /api/v1/kpi/rankings?scope`, `GET /api/v1/kpi/summaries`, `GET /api/v1/employees/{id}/profile`.
- UI: `/rankings?tab=overall|designation|lastN|summaries`, `/employees/[id]`, `components/rankings/ranking-table.tsx`, `components/employees/{engineer-trend-chart,profile-stats}.tsx` (shared with the dashboard modal).
- Tests: `tests/integration/app/rankings-profile.test.ts` (golden vs workbook), `tests/e2e/rankings.spec.ts` (incl. axe).

## Acceptance criteria status
- [x] AC-1: satisfied — the generated text is identical to the workbook's Interpretation cell: "Top established performer (≥5 sprints): Niba Tandukar (DevOps) at 9.53 over 10 sprints. Overall #1 by raw average: Dilendra Thagunna at 10.00 over 1 sprint(s). Leading team: DevOps at 8.97. Latest sprint S138 averaged 8.41 with 96% coverage."
- [x] AC-2: satisfied — with no data the paragraph is omitted (the summaries tab shows the empty-data notice).
