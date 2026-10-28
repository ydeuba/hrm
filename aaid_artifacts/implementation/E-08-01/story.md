---
story_id: E-08-01
epic_id: E-08
sprint: SPRINT-003
status: done
story_points: 3
completed_at: 2026-10-16T04:28:44.079Z
---

# E-08-01: Settings storage & validation API

| Field | Value |
|---|---|
| Epic | E-08 — Settings & Configuration |
| Sprint | SPRINT-003 |
| Status | **done** |
| Story points | 3 |

## User Story

**As a** HR Admin
**I want** KPI policy stored and validated centrally
**so that** every view uses the same rules

## Acceptance Criteria

- [x] AC-1: Given `GET /api/v1/settings`, then the stored settings merged over the domain defaults (ADR-015 table) are returned.
- [x] AC-2: Given `PUT` with invalid values (bands not descending, `lastNWindow` outside 1–20, negative tolerances), then 400 with field errors.
- [x] AC-3: Given a valid `PUT`, then `settingsRevision` increments and `SETTINGS_UPDATE` is audited with before and after.

## Dates

- Created:      2026-10-15 11:45 UTC
- Last updated: 2026-10-16 04:28 UTC
- Completed:    2026-10-16 04:28 UTC
