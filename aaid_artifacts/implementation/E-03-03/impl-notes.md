# E-03-03 — Teams & designations rename/order with aliases · Implementation record

## Shared implementation
- Application: `use-cases/employees/employee-use-cases.ts` (ListEmployees, GetEmployee, UpdateEmployee, ManageLabels); ports `employees.ts`, `employee-write.ts`.
- Infrastructure: `prisma-employee-repository.ts` (read/list), `prisma-employee-writer.ts` (transactional edit + alias bookkeeping, bumps scoreRevision), `prisma-label-repository.ts` (per-kind strategy; rename keeps RENAME alias; bumps settingsRevision).
- API: `GET /api/v1/employees`, `GET|PATCH /api/v1/employees/{id}`, `PATCH /api/v1/employees/{id}/locks`, `GET /api/v1/teams|designations`, `PATCH /api/v1/teams|designations/{id}`.
- UI: `/employees` (People list with search/filters, edit drawer with lock/unlock) and `/employees?tab=labels` (inline rename/reorder).
- Tests: `tests/integration/app/employees.test.ts` (31 incl. re-import scenarios), `tests/e2e/people.spec.ts`.

## Acceptance criteria status
- [x] AC-1: satisfied — renaming "Run Team" → "RUN" and re-importing "Run Team" maps to the same team (no duplicate).
- [x] AC-2: satisfied — sort order is editable and drives listing/chart order; headcount shown.
- [x] AC-3: satisfied — no delete is offered or exposed for teams/designations.
