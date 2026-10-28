# E-03-04 — Merge employees · Implementation record

## Implementation
- `use-cases/employees/employee-data-use-cases.ts` (MergeEmployees), `prisma-employee-data-repository.ts`; `POST /api/v1/employees/{id}/merge`; "Data maintenance" panel on the profile page.
- Tests: `tests/integration/app/employee-data.test.ts`.

## Acceptance criteria status
- [x] AC-1: satisfied — keepTarget moves non-conflicting scores and all aliases (source MERGE) and deletes the source.
- [x] AC-2: satisfied — with keepSource, the source scores replace the target on conflicts.
- [x] AC-3: satisfied — the same employee gives 400 SAME_EMPLOYEE; EMPLOYEE_MERGE is audited and scoreRevision is bumped.
