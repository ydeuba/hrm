---
story_id: E-08-04
epic_id: E-08
sprint: SPRINT-003
status: done
story_points: 2
completed_at: 2026-10-16T04:28:46.979Z
---

# E-08-04: Settings-driven recalculation

| Field | Value |
|---|---|
| Epic | E-08 — Settings & Configuration |
| Sprint | SPRINT-003 |
| Status | **done** |
| Story points | 2 |

## User Story

**As a** Management
**I want** views to reflect new settings immediately
**so that** I never see figures computed with old rules

## Acceptance Criteria

- [x] AC-1: Given a settings change, then the next dataset request returns a new ETag and the recomputed bands and ranks, with no re-import.
- [x] AC-2: Given a settings change after an import, then that import can still be rolled back.

## Dates

- Created:      2026-10-15 11:45 UTC
- Last updated: 2026-10-16 04:28 UTC
- Completed:    2026-10-16 04:28 UTC
