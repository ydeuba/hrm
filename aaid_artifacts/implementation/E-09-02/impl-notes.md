# E-09-02 — Audit log viewer · Implementation record

## Implementation
- Domain `shared/json-diff.ts`; port `AuditReader`; `use-cases/audit/list-audit-events.ts`; `infrastructure/audit/prisma-audit-reader.ts`; `app/_lib/audit-query.ts`; `GET /api/v1/audit`; page `/audit`.
- Tests: `tests/unit/domain/shared/json-diff.test.ts`, `tests/integration/app/audit.test.ts`, `tests/e2e/audit.spec.ts` (incl. axe).

## Acceptance criteria status
- [x] AC-1: satisfied — newest first; date-range and action filters; keyset cursor of 50 per page (61 events reached exactly once).
- [x] AC-2: satisfied — expanding an event shows a field-level before/after diff (e.g. bands.0.min 8 → 9) plus meta.
- [x] AC-3: satisfied — times and filter days use Asia/Kathmandu (UTC+05:45); the page has no mutating controls.
