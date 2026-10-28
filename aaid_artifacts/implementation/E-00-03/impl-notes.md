# E-00-03 — Database schema & migrations · Implementation record

## Files
- `prisma/schema.prisma`: the full data model (17 tables, enums, indexes, referential actions).
- `prisma/migrations/20261015115541_init/migration.sql`: the initial migration.
- `prisma.config.ts`: datasource URL from `DATABASE_URL`; seed command.
- `src/infrastructure/db/prisma.ts`: `createPrismaClient(url)`, which uses the better-sqlite3 adapter and sets `journal_mode=WAL`, `foreign_keys=ON` and `busy_timeout=5000`.
- `src/infrastructure/db/seed-reference.ts`: idempotent reference seed. `prisma/seed.ts` is its CLI (`npm run seed`).
- `src/infrastructure/db/json.ts`: typed JSON conversion for Prisma `Json` columns.
- `src/domain/settings/{kpi-settings,defaults}.ts`: settings types and the ADR-015 defaults.
- `src/domain/shared/name.ts`: `normaliseName` / `displayName` (NFC, whitespace collapse).
- `tests/helpers/test-db.ts`: an isolated temporary database per test file, with migrations applied directly through better-sqlite3 (fast, no CLI).
- Tests: `tests/integration/db/schema.test.ts`, `tests/unit/domain/shared/name.test.ts`.

## Notes
- **Table count is 17, not 18** as the backlog AC said. The AC miscounted: the data model lists 17 entities (the AdminUser/Session/LoginThrottle auth tables, the four alias and label tables, and so on). Every entity in the architecture is present.
- `Employee.normalisedName` is indexed but **not unique**. Name uniqueness lives in `EmployeeAlias` (ADR-018); a test asserts this.
- `server-only` throws outside the `react-server` condition. Vitest aliases it to `empty.js`, and scripts run with `tsx --conditions=react-server`.
- The rule that `valueCenti` is present iff `status = SCORED` is enforced in the repository layer (E-02-07), as planned.
- Restrict / Cascade / SetNull referential actions follow the ownership in the data model. Employees can't be deleted while referenced by a team or designation (Restrict), while scores and aliases cascade.

## Acceptance criteria status
- [x] AC-1: satisfied — the migration creates all 17 tables, the unique keys (alias namespaces, sprint code/number, journal seq…) and the lookup indexes; asserted from `sqlite_master`.
- [x] AC-2: satisfied — `journal_mode` = `wal` and `foreign_keys` = 1 are asserted; an FK violation is rejected.
- [x] AC-3: satisfied — the seed creates Team Lead/SSE/SE/ASE (sort orders 1–4, CANONICAL aliases), SystemState 0/0 and the default AppSettings; a second run creates nothing (asserted). Also verified via `npm run seed` twice on the dev DB.
- [x] AC-4: satisfied — `createTestDb()` gives each test file its own migrated temporary database with cleanup.
