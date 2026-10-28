---
story_id: E-04-04
epic_id: E-04
sprint: SPRINT-001
status: done
story_points: 3
completed_at: 2026-10-15T15:45:40.695Z
---

# E-04-04: Group aggregates & sprint trend

| Field | Value |
|---|---|
| Epic | E-04 — KPI Calculation Engine |
| Sprint | SPRINT-001 |
| Status | **done** |
| Story points | 3 |

## User Story

**As a** Management
**I want** weighted team and designation averages and a per-sprint trend
**so that** I can compare groups fairly and see the direction over time

## Acceptance Criteria

- [x] AC-1: Given the workbook fixture, then the team summary (people, score observations, total, weighted average, rank) matches the Performance Insights sheet (e.g. DevOps: 7 people, 41 observations, 8.97, rank 1).
- [x] AC-2: Given the fixture, then the designation summary matches (e.g. ASE: 20 people, 197 observations, 7.64).
- [x] AC-3: Given the fixture, then the sprint trend average and participants match (e.g. S138: 8.41 with 47 participants), and sprints with no scores have a null average, not 0.
- [x] AC-4: Coverage = participants ÷ active engineers, so S138 coverage = 95.9%.

## Dates

- Created:      2026-10-15 11:45 UTC
- Last updated: 2026-10-15 15:45 UTC
- Completed:    2026-10-15 15:45 UTC
