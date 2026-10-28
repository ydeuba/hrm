# E-03-01 — Employee list · Implementation record

## Shared implementation
- Application: `use-cases/employees/employee-use-cases.ts` (ListEmployees, GetEmployee, UpdateEmployee, ManageLabels); ports `employees.ts`, `employee-write.ts`.
- Infrastructure: `prisma-employee-repository.ts` (read/list), `prisma-employee-writer.ts` (transactional edit + alias bookkeeping, bumps scoreRevision), `prisma-label-repository.ts` (per-kind strategy; rename keeps RENAME alias; bumps settingsRevision).
- API: `GET /api/v1/employees`, `GET|PATCH /api/v1/employees/{id}`, `PATCH /api/v1/employees/{id}/locks`, `GET /api/v1/teams|designations`, `PATCH /api/v1/teams|designations/{id}`.
- UI: `/employees` (People list with search/filters, edit drawer with lock/unlock) and `/employees?tab=labels` (inline rename/reorder).
- Tests: `tests/integration/app/employees.test.ts` (31 incl. re-import scenarios), `tests/e2e/people.spec.ts`.

## Acceptance criteria status
- [x] AC-1: satisfied — name, code, team, designation, status and sprints scored.
- [x] AC-2: satisfied — search (name or code), team, designation and status filters.
- [x] AC-3: satisfied — cursor pagination at 200 per page ("Next page").
