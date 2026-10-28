---
story_id: E-05-05
epic_id: E-05
sprint: SPRINT-002
status: done
story_points: 3
completed_at: 2026-10-16T01:50:44.984Z
---

# E-05-05: Sortable engineer table

| Field | Value |
|---|---|
| Epic | E-05 — KPI Dashboard |
| Sprint | SPRINT-002 |
| Status | **done** |
| Story points | 3 |

## User Story

**As a** HR Admin
**I want** a sortable table of every engineer
**so that** I can scan and compare individuals

## Acceptance Criteria

- [x] AC-1: Given the table, then the columns are Rank (overall), Name, Team, Designation, Sprints, Total, Avg, Last 3, Momentum, Rating.
- [x] AC-2: Given a header click, then the sort toggles; nulls always sort last; text columns default ascending and numbers descending; `aria-sort` is set.
- [x] AC-3: Given keyboard focus on a row, when I press Enter, then the engineer profile opens (E-06-01).
- [x] AC-4: Given two adjacent rows with equal 2-dp averages but different ranks, then the average's tooltip shows 3 dp.

## Dates

- Created:      2026-10-15 11:45 UTC
- Last updated: 2026-10-16 01:50 UTC
- Completed:    2026-10-16 01:50 UTC
