---
story_id: E-02-07
epic_id: E-02
sprint: SPRINT-002
status: done
story_points: 5
completed_at: 2026-10-15T16:16:54.441Z
---

# E-02-07: Atomic commit with revision guard & journal

| Field | Value |
|---|---|
| Epic | E-02 — Excel KPI Import & Validation |
| Sprint | SPRINT-002 |
| Status | **done** |
| Story points | 5 |

## User Story

**As a** HR Admin
**I want** confirming an import to apply all changes at once, or none
**so that** the data is never half-updated

## Acceptance Criteria

- [x] AC-1: Given a preview whose `baseRevision` equals the current `scoreRevision`, when I confirm, then employees, aliases, teams, designations, sprints and scores are written in one transaction, every mutation has an `ImportChange` journal row, and the batch becomes COMMITTED with `commitRevision = base + 1`.
- [x] AC-2: Given data changed since the preview (the revision moved), then 409 `CONFLICT_STALE_PREVIEW` and nothing is written.
- [x] AC-3: Given a failure injected mid-transaction, then the database is identical to before (verified by row counts and checksums).
- [x] AC-4: Given a locked employee field, then it is not overwritten; given `importNotScoredOverwrites=true`, then a file N/A clears a stored score.
- [x] AC-5: Given the sample workbook into an empty DB, then 49 employees, 8 teams, 4 designations, 17 sprints and 560 scored cells exist.

## Dates

- Created:      2026-10-15 11:45 UTC
- Last updated: 2026-10-15 16:16 UTC
- Completed:    2026-10-15 16:16 UTC
