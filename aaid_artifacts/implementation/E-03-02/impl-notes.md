# E-03-02 — Edit employee with aliases & field locks · Implementation record

## Shared implementation
- Application: `use-cases/employees/employee-use-cases.ts` (ListEmployees, GetEmployee, UpdateEmployee, ManageLabels); ports `employees.ts`, `employee-write.ts`.
- Infrastructure: `prisma-employee-repository.ts` (read/list), `prisma-employee-writer.ts` (transactional edit + alias bookkeeping, bumps scoreRevision), `prisma-label-repository.ts` (per-kind strategy; rename keeps RENAME alias; bumps settingsRevision).
- API: `GET /api/v1/employees`, `GET|PATCH /api/v1/employees/{id}`, `PATCH /api/v1/employees/{id}/locks`, `GET /api/v1/teams|designations`, `PATCH /api/v1/teams|designations/{id}`.
- UI: `/employees` (People list with search/filters, edit drawer with lock/unlock) and `/employees?tab=labels` (inline rename/reorder).
- Tests: `tests/integration/app/employees.test.ts` (31 incl. re-import scenarios), `tests/e2e/people.spec.ts`.

## Acceptance criteria status
- [x] AC-1: satisfied — a rename keeps the old normalised name as an alias; a later import using the old spelling matches the same employee (integration).
- [x] AC-2: satisfied — a manual team/designation change sets the lock; a later import with another value keeps the HR value and reports LOCKED_FIELD_DIFFERS.
- [x] AC-3: satisfied — "Unlock" (PATCH /locks) lets the next import update the field again.
- [x] AC-4: satisfied — Inactive employees disappear from the default dashboard dataset but appear with includeInactive.
- [x] AC-5: satisfied — EMPLOYEE_UPDATE audit with before/after of exactly the changed fields; a duplicate code → 409, a name clash → 409.
