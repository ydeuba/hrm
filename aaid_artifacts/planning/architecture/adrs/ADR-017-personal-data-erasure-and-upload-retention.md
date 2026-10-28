# ADR-017: Personal-data erasure and upload retention

_Source of truth: [architecture.md](../architecture.md) — extracted 2026-10-15._

- **Status**: Accepted
- **Context**: NFR-15 (Nepal Individual Privacy Act 2075) and review finding #4. The original uploads, the import journal, issues and the audit trail all contain names and scores, and a rollback could resurrect an erased person.
- **Decision**: `EraseEmployee` runs in one transaction and does the following:
  1. Deletes the employee, their scores and aliases.
  2. Redacts `ImportChange.before/after`, `ImportIssue.employeeName/message` and `AuditEvent.before/after/meta` that reference the employee's ID or any of their normalised names, replacing those values with `"[erased]"`.
  3. Bumps `scoreRevision`, which makes every earlier batch non-rollback-able.
  4. Deletes all stored upload originals (they contain the person). The confirmation dialog lists how many files will be removed.
  5. Writes a single `EMPLOYEE_ERASE` audit event containing only the former employee ID.

  Separately, uploads older than `uploadRetentionDays` (default 90) are purged lazily on the next upload, and their batches keep only summary metadata.
- **Consequences**: Erasure is real and testable (an integration test searches every table and the uploads folder for the erased name). The cost is that original files used for older batches can no longer be downloaded after an erasure or the retention period.
