---
story_id: E-02-04
epic_id: E-02
sprint: SPRINT-002
status: done
story_points: 5
completed_at: 2026-10-15T16:06:07.327Z
---

# E-02-04: Identity matching & diff engine

| Field | Value |
|---|---|
| Epic | E-02 — Excel KPI Import & Validation |
| Sprint | SPRINT-002 |
| Status | **done** |
| Story points | 5 |

## User Story

**As a** HR Admin
**I want** the import compared against what's already stored
**so that** I see exactly who and what will change

## Acceptance Criteria

- [x] AC-1: Given an existing employee whose alias matches the file name (case or whitespace differences included), then the row is matched, not created.
- [x] AC-2: Given a file name within edit distance ≤ 2 of an existing employee but not an alias, then a `NEAR_DUPLICATE` is listed for confirmation.
- [x] AC-3: Given team or designation names, then they resolve through TeamAlias/DesignationAlias, and unknown ones are listed as "new team" or "new designation".
- [x] AC-4: The diff reports: new employees, matched, attribute changes, `LOCKED_FIELD_DIFFERS` warnings, new sprints, scores added, changed and unchanged, and not-in-file, with the counts summing correctly.
- [x] AC-5: Given one normalised name mapping to more than one employee, then an `AMBIGUOUS_NAME` error.

## Dates

- Created:      2026-10-15 11:45 UTC
- Last updated: 2026-10-15 16:06 UTC
- Completed:    2026-10-15 16:06 UTC
