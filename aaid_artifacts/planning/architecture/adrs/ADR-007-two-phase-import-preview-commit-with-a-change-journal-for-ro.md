# ADR-007: Two-phase import (preview → commit) with a change journal for rollback and optimistic concurrency

_Source of truth: [architecture.md](../architecture.md) — extracted 2026-10-15._

- **Status**: Accepted
- **Context**: HR must see exactly what will change before it is written (US-02-03), imports must be atomic (NFR-17), the latest import must be reversible (US-02-06), and sprints missing from the file must be preserved (US-02-05).
- **Decision**:
  1. **Preview.** `POST /api/v1/imports` stores the original file (content-addressed by SHA-256), parses it into a normalised `ParsedMasterSheet`, computes the diff against the current database, and saves an `ImportBatch{status: PREVIEW, baseRevision = scoreRevision, parsedJson, summaryJson}` together with its `ImportIssue` rows. Nothing else is written.
  2. **Commit.** `POST /imports/{id}/commit` runs in one transaction.
     - **Revision guard first.** The first statement is a conditional increment, `UPDATE SystemState SET scoreRevision = base + 1 WHERE id = 1 AND scoreRevision = base`. If it affects 0 rows, the transaction returns **409** and HR must re-preview. Doing this as the first statement takes SQLite's write lock up front, so concurrent commits can't both pass the check.
     - **Recompute the diff.** The diff is recomputed from the stored `parsed` rows inside the transaction (it equals the preview, because the revision is unchanged).
     - **Apply.** It upserts reference data (resolving names through aliases), employees, aliases and scores. Locked employee fields are never overwritten (ADR-018). Each mutation also writes an `ImportChange{entity, entityKey, before, after}` journal row.
     - **Finish.** It marks the batch COMMITTED with `commitRevision = base + 1`.
  3. **Rollback.** Only the most recent COMMITTED batch can be rolled back, and only when `scoreRevision === commitRevision`, so later score or employee edits, merges and erasures block it. Settings changes do **not** block it: they bump the separate `settingsRevision`. Rollback replays the journal in reverse inside one transaction, guarded by the same conditional increment.
  4. Previews expire after 30 minutes; a lazy cleanup runs on the next upload.
- **Consequences**: Imports are safe, auditable and reversible, and the "is this file different from last time?" question is answered by the file hash. The journal grows with every import (about 1k rows per import, which is negligible). Rolling back older batches is deliberately not supported.
