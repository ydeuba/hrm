---
story_id: E-03-04
epic_id: E-03
sprint: SPRINT-004
status: done
story_points: 5
completed_at: 2026-10-16T15:00:10.316Z
---

# E-03-04: Merge employees

| Field | Value |
|---|---|
| Epic | E-03 — Employee, Team & Sprint Master Data |
| Sprint | SPRINT-004 |
| Status | **done** |
| Story points | 5 |

## User Story

**As a** HR Admin
**I want** to merge a duplicate employee into the correct one
**so that** a misspelt import doesn't split someone's history

## Acceptance Criteria

- [x] AC-1: Given source B and target A, when I merge with `keepTarget`, then B's scores move to A except where A already has a score for that sprint, B's aliases move to A, and B is deleted.
- [x] AC-2: Given `keepSource`, then B's conflicting scores replace A's.
- [x] AC-3: Given A = B, then 400 `SAME_EMPLOYEE`; the merge is audited and bumps `scoreRevision`.

## Dates

- Created:      2026-10-15 11:45 UTC
- Last updated: 2026-10-16 15:00 UTC
- Completed:    2026-10-16 15:00 UTC
