---
story_id: E-05-02
epic_id: E-05
sprint: SPRINT-002
status: done
story_points: 3
completed_at: 2026-10-16T01:50:42.579Z
---

# E-05-02: Filters with bookmarkable state

| Field | Value |
|---|---|
| Epic | E-05 — KPI Dashboard |
| Sprint | SPRINT-002 |
| Status | **done** |
| Story points | 3 |

## User Story

**As a** HR Admin
**I want** to filter by designation, team, rating, coverage, sprint range, status and name
**so that** I can focus on one segment

## Acceptance Criteria

- [x] AC-1: Given several filters, then they combine with AND, and cards, charts and table update together in ≤ 300 ms.
- [x] AC-2: Given a filter change, then the URL query updates; reloading or sharing that URL restores the same view.
- [x] AC-3: Given "Reset", then all filters return to their defaults.
- [x] AC-4: Given a sprint range change, then the dataset is re-fetched (E-04-06); other filters run client-side only.

## Dates

- Created:      2026-10-15 11:45 UTC
- Last updated: 2026-10-16 01:50 UTC
- Completed:    2026-10-16 01:50 UTC
