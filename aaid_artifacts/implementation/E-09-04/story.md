---
story_id: E-09-04
epic_id: E-09
sprint: SPRINT-004
status: done
story_points: 2
completed_at: 2026-10-16T05:43:48.160Z
---

# E-09-04: Restore procedure & verification test

| Field | Value |
|---|---|
| Epic | E-09 — Audit & Data Governance |
| Sprint | SPRINT-004 |
| Status | **done** |
| Story points | 2 |

## User Story

**As a** HR Admin
**I want** a documented, tested restore
**so that** a backup is actually usable

## Acceptance Criteria

- [x] AC-1: The README documents the steps: stop the app → unzip into `DATA_DIR` → `prisma migrate deploy` → start.
- [x] AC-2: An integration test restores a backup into a temporary `DATA_DIR`, and the row counts per table equal the source.

## Dates

- Created:      2026-10-15 11:45 UTC
- Last updated: 2026-10-16 05:43 UTC
- Completed:    2026-10-16 05:43 UTC
