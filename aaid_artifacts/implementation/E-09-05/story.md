---
story_id: E-09-05
epic_id: E-09
sprint: SPRINT-004
status: done
story_points: 2
completed_at: 2026-10-16T15:00:18.235Z
---

# E-09-05: Upload retention purge

| Field | Value |
|---|---|
| Epic | E-09 — Audit & Data Governance |
| Sprint | SPRINT-004 |
| Status | **done** |
| Story points | 2 |

## User Story

**As a** HR Admin
**I want** old uploaded files purged automatically
**so that** we don't keep personal data longer than needed

## Acceptance Criteria

- [x] AC-1: Given uploads older than `uploadRetentionDays` (default 90), when the next upload happens, then those files are deleted and their batches keep only summary metadata.
- [x] AC-2: Given a purged batch, then "Download original" is disabled with the reason.

## Dates

- Created:      2026-10-15 11:45 UTC
- Last updated: 2026-10-16 15:00 UTC
- Completed:    2026-10-16 15:00 UTC
