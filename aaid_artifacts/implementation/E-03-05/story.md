---
story_id: E-03-05
epic_id: E-03
sprint: SPRINT-004
status: done
story_points: 3
completed_at: 2026-10-16T15:00:12.266Z
---

# E-03-05: Correct a single score

| Field | Value |
|---|---|
| Epic | E-03 — Employee, Team & Sprint Master Data |
| Sprint | SPRINT-004 |
| Status | **done** |
| Story points | 3 |

## User Story

**As a** HR Admin
**I want** to fix one wrong score with a reason
**so that** I don't need to re-import the whole sheet

## Acceptance Criteria

- [x] AC-1: Given a valid cell (score 0–10, RUN or N/A) and a reason of 3–500 characters, then the score updates and `SCORE_CORRECT` is audited with before and after.
- [x] AC-2: Given an out-of-range value, then 422 `OUT_OF_RANGE`.
- [x] AC-3: Given a correction, then rollback of earlier imports is blocked (the revision moved).

## Dates

- Created:      2026-10-15 11:45 UTC
- Last updated: 2026-10-16 15:00 UTC
- Completed:    2026-10-16 15:00 UTC
