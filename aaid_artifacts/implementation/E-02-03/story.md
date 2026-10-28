---
story_id: E-02-03
epic_id: E-02
sprint: SPRINT-002
status: done
story_points: 5
completed_at: 2026-10-15T16:06:05.475Z
---

# E-02-03: Cell parsing & row validation

| Field | Value |
|---|---|
| Epic | E-02 — Excel KPI Import & Validation |
| Sprint | SPRINT-002 |
| Status | **done** |
| Story points | 5 |

## User Story

**As a** HR Admin
**I want** every cell interpreted correctly and bad values reported
**so that** averages are never distorted by RUN, N/A or typos

## Acceptance Criteria

- [x] AC-1: Given `RUN` → RUN; `N/A`, `NA`, `-`, blank or `#DIV/0!` → NOT_SCORED; a number from 0 to 10 → SCORED in centi, using half-up rounding (`5.975` → 598 with a `PRECISION_ROUNDED` warning).
- [x] AC-2: Given a value outside 0–10 or non-numeric text, then an ERROR issue with its row and column, and the preview reports `canCommit=false`.
- [x] AC-3: Given section rows (TEAM LEAD, SSE, SE, ASE, QA, BA, LEAD) or rows without a name or designation, then they are skipped.
- [x] AC-4: Given two rows with the same normalised name (and no code column), then a `DUPLICATE_NAME` error.

## Dates

- Created:      2026-10-15 11:45 UTC
- Last updated: 2026-10-15 16:06 UTC
- Completed:    2026-10-15 16:06 UTC
