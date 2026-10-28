# E-03-06 — Privacy erasure · Implementation record

## Implementation
- Domain `shared/redact.ts`; EraseEmployee use case; `DELETE /api/v1/employees/{id}`; typed-name confirmation dialog stating the number of uploads.
- The redaction needles cover the ID, display name, normalised name, aliases, employee code and email. Audit rows whose entity is the person lose their whole payload; other rows are redacted string by string.

## Acceptance criteria status
- [x] AC-1: satisfied — the employee, scores and aliases are deleted; journal, issue, batch summary and audit payloads are redacted to "[erased]".
- [x] AC-2: satisfied — every stored original is deleted (the dialog states how many); the revision bump blocks every earlier rollback.
- [x] AC-3: satisfied — the integration test scans every column of every table, plus DATA_DIR/uploads, for the name and the employee code and finds 0 occurrences; EMPLOYEE_ERASE holds only the former ID.
