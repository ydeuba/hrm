---
story_id: E-04-02
epic_id: E-04
sprint: SPRINT-001
status: done
story_points: 2
completed_at: 2026-10-15T15:45:36.865Z
---

# E-04-02: Rating bands

| Field | Value |
|---|---|
| Epic | E-04 — KPI Calculation Engine |
| Sprint | SPRINT-001 |
| Status | **done** |
| Story points | 2 |

## User Story

**As a** Management
**I want** ratings assigned from consistent thresholds
**so that** ratings are comparable across teams

## Acceptance Criteria

- [x] AC-1: Given the default bands, then 8.00 → Outstanding, 7.99 → Exceeds, 6.00 → Exceeds, 5.99 → Meets, 4.99 → Needs Improvement, and no scores → N/A.
- [x] AC-2: Given an exact average of 7.995, then the band is computed from the 2-dp value 8.00 → Outstanding (ADR-016).
- [x] AC-3: Given bands that don't descend strictly or lie outside 0–10, then `validateBands` returns an error.

## Dates

- Created:      2026-10-15 11:45 UTC
- Last updated: 2026-10-15 15:45 UTC
- Completed:    2026-10-15 15:45 UTC
