---
story_id: E-02-08
epic_id: E-02
sprint: SPRINT-003
status: done
story_points: 5
completed_at: 2026-10-16T01:55:36.696Z
---

# E-02-08: Roll back latest import

| Field | Value |
|---|---|
| Epic | E-02 — Excel KPI Import & Validation |
| Sprint | SPRINT-003 |
| Status | **done** |
| Story points | 5 |

## User Story

**As a** HR Admin
**I want** to undo the most recent import
**so that** I can recover from uploading the wrong file

## Acceptance Criteria

- [x] AC-1: Given the latest COMMITTED batch and `scoreRevision == commitRevision`, when I roll back and confirm, then every journalled change is reversed (created rows deleted, updated rows restored) and the batch becomes ROLLED_BACK.
- [x] AC-2: Given a later score or employee edit, merge or erasure, then 409 `CONFLICT_LATER_CHANGES`; a settings change alone does **not** block rollback.
- [x] AC-3: Given a batch that isn't the latest, then 409 `NOT_LATEST`.
- [x] AC-4: Import A → import B → rollback B restores the state after A exactly (snapshot comparison).

## Dates

- Created:      2026-10-15 11:45 UTC
- Last updated: 2026-10-16 01:55 UTC
- Completed:    2026-10-16 01:55 UTC
