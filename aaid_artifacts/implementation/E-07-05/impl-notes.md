# E-07-05 — Team batch appraisal print · Implementation record

## Implementation
- `use-cases/kpi/get-team-appraisals.ts`, `src/app/(print)/print/teams/[id]/page.tsx`; a "Print appraisals" link per team on Employees → Teams & designations.
- Tests: `tests/integration/app/appraisals.test.ts`, `tests/e2e/people.spec.ts` (E-07-05).

## Acceptance criteria status
- [x] AC-1: satisfied — one summary per active engineer, in name order; `.appraisal-page { break-after: page }` (e2e checks the computed style under print media).
- [x] AC-2: satisfied — a team with 0 engineers renders a "No engineers in this team." page.
