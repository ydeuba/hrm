---
story_id: E-02-09
epic_id: E-02
sprint: SPRINT-003
status: done
story_points: 2
completed_at: 2026-10-16T01:55:38.646Z
---

# E-02-09: Import history & original-file download

| Field | Value |
|---|---|
| Epic | E-02 — Excel KPI Import & Validation |
| Sprint | SPRINT-003 |
| Status | **done** |
| Story points | 2 |

## User Story

**As a** HR Admin
**I want** to see past imports and download the original files
**so that** I can trace where the figures came from

## Acceptance Criteria

- [x] AC-1: Given past imports, then `/imports` lists date, file name, status, uploader and summary counts, newest first, paginated.
- [x] AC-2: Given a batch whose original is still retained, then "Download original" returns the exact bytes (hash matches); otherwise the button is disabled with the reason "removed by retention/erasure".
- [x] AC-3: The rollback button appears only on the batch that can be rolled back.

## Dates

- Created:      2026-10-15 11:45 UTC
- Last updated: 2026-10-16 01:55 UTC
- Completed:    2026-10-16 01:55 UTC
