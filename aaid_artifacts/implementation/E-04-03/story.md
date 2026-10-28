---
story_id: E-04-03
epic_id: E-04
sprint: SPRINT-001
status: done
story_points: 5
completed_at: 2026-10-15T15:45:38.766Z
---

# E-04-03: Rankings with exact-precision comparison

| Field | Value |
|---|---|
| Epic | E-04 — KPI Calculation Engine |
| Sprint | SPRINT-001 |
| Status | **done** |
| Story points | 5 |

## User Story

**As a** Management
**I want** rankings that match the master sheet exactly
**so that** nobody's appraisal rank changes because of software rounding

## Acceptance Criteria

- [x] AC-1: Given the workbook fixture, then the overall ranks equal the Compile Sheet "Overall Rankings" for all 49 employees (e.g. Mandip at 9.00 ranks above Sajjan, who shows 9.00 but is actually 8.9956).
- [x] AC-2: Given two engineers with identical exact averages and totals, then they share a rank and the next rank is skipped (1, 2, 2, 4).
- [x] AC-3: Given `groupBy: 'designation'`, then ranks restart at 1 within each designation; given `minSprints = 5`, then engineers below it get `eligible = false` and `rank = null`.
- [x] AC-4: Given `lastNWindow(6)`, then the window is the 6 most recent sprints that have any score (S133–S138 on the fixture), and last-N averages match Sheet1 column C.

## Dates

- Created:      2026-10-15 11:45 UTC
- Last updated: 2026-10-15 15:45 UTC
- Completed:    2026-10-15 15:45 UTC
