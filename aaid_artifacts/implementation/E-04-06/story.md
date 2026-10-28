---
story_id: E-04-06
epic_id: E-04
sprint: —
status: done
story_points: 3
completed_at: 2026-10-16T01:50:48.673Z
---

# E-04-06: Sprint-range selection

| Field | Value |
|---|---|
| Epic | E-04 — KPI Calculation Engine |
| Sprint | — |
| Status | **done** |
| Story points | 3 |

## User Story

**As a** HR Admin
**I want** to restrict every metric to a from/to sprint range
**so that** I can produce figures for a specific appraisal period

## Acceptance Criteria

- [x] AC-1: Given `from=S130&to=S135`, then metrics, ranks, trend and groups use only those sprints.
- [x] AC-2: Given from > to, or an unknown sprint code, then 400 `VALIDATION_FAILED`.
- [x] AC-3: Given no range, then all sprints are used.

## Dates

- Created:      2026-10-15 11:45 UTC
- Last updated: 2026-10-16 01:50 UTC
- Completed:    2026-10-16 01:50 UTC
