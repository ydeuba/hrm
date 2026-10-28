# E-09-01 — Audit event recording · Implementation record

## Files
The `AuditLog` port (`src/application/ports/audit-log.ts`) and `PrismaAuditLog` were introduced in E-00-04 and are used by every use case. The import commit writes its audit row inside the commit transaction. Test: `tests/integration/app/password-and-audit.test.ts`.

## Acceptance criteria status
- [x] AC-1: satisfied — login ok/fail/lockout, logout, password change, import preview/commit/discard (and rollback, E-02-08) each write exactly one row with time, actor, action, entity and payload. Employee, merge, erase, score-correct, settings and backup events are emitted by their stories.
- [x] AC-2: satisfied — a test drives a full session (failed login, login, import, commit, logout) and asserts no audit payload contains either password, the session token, or score cells.
- [x] AC-3: satisfied — there were no interim direct writes; everything goes through the port.
