# E-03-07 — Sprint dates · Implementation record

## Implementation
- Domain `kpi/sprint-period.ts`; port `ports/sprints.ts`; `prisma-sprint-repository.ts`; ManageSprints use case; `GET /api/v1/sprints`, `PATCH /api/v1/sprints/{code}`; a Settings → Sprint dates section; tooltip titles via `components/charts/period-title.ts`.
- Date edits bump settingsRevision, not scoreRevision, so datasets refresh without blocking rollback. Audited as SPRINT_UPDATE.

## Acceptance criteria status
- [x] AC-1: satisfied — set or clear start and end dates; end ≥ start is validated (400 with a field error).
- [x] AC-2: satisfied — dataset and profile include sprintLabels; dashboard, print and profile trend tooltips show "S138 · 06 Oct – 17 Oct 2026".
