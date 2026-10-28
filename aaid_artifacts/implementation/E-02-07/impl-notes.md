# E-02-07 — Atomic commit with revision guard & journal · Implementation record

## Files
- `src/application/use-cases/imports/commit-import.ts`: checks status, expiry and errors, validates merges against those offered, recomputes the diff from the stored parsed rows, calls the committer.
- `src/infrastructure/db/repositories/prisma-import-committer.ts`. One interactive transaction:
  1. a conditional `scoreRevision` increment (`WHERE scoreRevision = base`) as the **first statement**;
  2. teams and designations, each with a CANONICAL alias;
  3. sprints;
  4. employees (create, or update team/designation unless locked) and MERGE aliases;
  5. scores (createMany for new; update with the previous value journalled);
  6. `ImportChange` journal rows (createMany);
  7. the batch → COMMITTED with `commitRevision`, `parsed` cleared;
  8. the `IMPORT_COMMIT` audit row, written in the same transaction.
- `score-mapping.ts`: `valueCenti` present iff SCORED.
- `POST /api/v1/imports/{id}/commit`.

## Acceptance criteria status
- [x] AC-1: satisfied — everything is written in one transaction with a journal row per mutation (journal count asserted: 8×2 teams+aliases, 17 sprints, 49×2 employees+aliases, 560 scored + RUN cells); `commitRevision = base + 1`.
- [x] AC-2: satisfied — when the revision moved since the preview: 409 `CONFLICT_STALE_PREVIEW`, nothing written.
- [x] AC-3: satisfied — a failure injected mid-transaction (invalid designation FK) leaves the employee, score, journal, team and sprint counts and the revision identical.
- [x] AC-4: satisfied — locked fields are never overwritten (domain tests on `LOCKED_FIELD_DIFFERS`); `importNotScoredOverwrites=true` clears a stored score when the file says N/A (domain test).
- [x] AC-5: satisfied — the sample into an empty DB gives 49 employees, 8 teams, 4 designations, 17 sprints and 560 scored cells (E44 stored as 598).
