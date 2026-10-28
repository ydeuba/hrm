---
story_id: E-09-03
epic_id: E-09
sprint: SPRINT-003
status: done
story_points: 2
completed_at: 2026-10-16T05:43:16.461Z
---

# E-09-03: Backup download

| Field | Value |
|---|---|
| Epic | E-09 — Audit & Data Governance |
| Sprint | SPRINT-003 |
| Status | **done** |
| Story points | 2 |

## User Story

**As a** HR Admin
**I want** to download a backup
**so that** the data survives a disk failure or a move to a server

## Acceptance Criteria

- [x] AC-1: Given "Download backup", then a zip `hrm-backup_<yyyymmdd-HHmm>.zip` containing a consistent DB snapshot (`VACUUM INTO`) and `uploads/` streams to the browser.
- [x] AC-2: Given a backup taken during an import, then the snapshot is transactionally consistent.
- [x] AC-3: `BACKUP_CREATE` is audited.

## Dates

- Created:      2026-10-15 11:45 UTC
- Last updated: 2026-10-16 05:43 UTC
- Completed:    2026-10-16 05:43 UTC
