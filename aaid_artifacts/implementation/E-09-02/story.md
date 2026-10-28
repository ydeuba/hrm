---
story_id: E-09-02
epic_id: E-09
sprint: SPRINT-004
status: done
story_points: 3
completed_at: 2026-10-16T15:00:08.351Z
---

# E-09-02: Audit log viewer

| Field | Value |
|---|---|
| Epic | E-09 — Audit & Data Governance |
| Sprint | SPRINT-004 |
| Status | **done** |
| Story points | 3 |

## User Story

**As a** Management
**I want** to browse the audit trail
**so that** I can check who changed what and when

## Acceptance Criteria

- [x] AC-1: Given `/audit`, then events show newest first, filterable by date range and action, with cursor pagination.
- [x] AC-2: Given an event, then expanding it shows a before/after diff.
- [x] AC-3: Times display in Asia/Kathmandu; the view is read-only.

## Dates

- Created:      2026-10-15 11:45 UTC
- Last updated: 2026-10-16 15:00 UTC
- Completed:    2026-10-16 15:00 UTC
