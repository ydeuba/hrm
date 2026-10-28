---
story_id: E-04-05
epic_id: E-04
sprint: SPRINT-002
status: done
story_points: 5
completed_at: 2026-10-15T16:32:41.133Z
---

# E-04-05: Dashboard dataset query & API

| Field | Value |
|---|---|
| Epic | E-04 — KPI Calculation Engine |
| Sprint | SPRINT-002 |
| Status | **done** |
| Story points | 5 |

## User Story

**As a** HR Admin
**I want** the dashboard data served in one compact, cached response
**so that** the dashboard loads quickly and filters instantly

## Acceptance Criteria

- [x] AC-1: Given committed data, when `GET /api/v1/kpi/dataset` is called, then it returns `KpiDatasetDto` with cells encoded as `number | 'R' | null`, sprints in numeric order, server-computed overall ranks and the data-check summary.
- [x] AC-2: Given an unchanged `scoreRevision.settingsRevision`, when the request carries the matching `If-None-Match`, then the response is 304.
- [x] AC-3: Given 500 × 200 seeded engineers × sprints, then the response is ≤ 500 ms p95 and ≤ 0.7 MB uncompressed.
- [x] AC-4: Given `includeInactive=false` (the default), then inactive employees are excluded.

## Dates

- Created:      2026-10-15 11:45 UTC
- Last updated: 2026-10-15 16:32 UTC
- Completed:    2026-10-15 16:32 UTC
