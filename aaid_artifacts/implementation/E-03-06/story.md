---
story_id: E-03-06
epic_id: E-03
sprint: SPRINT-004
status: done
story_points: 5
completed_at: 2026-10-16T15:00:14.209Z
---

# E-03-06: Privacy erasure

| Field | Value |
|---|---|
| Epic | E-03 — Employee, Team & Sprint Master Data |
| Sprint | SPRINT-004 |
| Status | **done** |
| Story points | 5 |

## User Story

**As a** HR Admin
**I want** to permanently erase a person's data on request
**so that** we comply with the Nepal Individual Privacy Act 2075

## Acceptance Criteria

- [x] AC-1: Given I type the employee's exact name to confirm, then the employee, scores and aliases are deleted, and journal, issue and audit payloads referencing them are redacted to `"[erased]"`.
- [x] AC-2: Given erasure, then all stored upload originals are deleted (the dialog states how many) and earlier batches can no longer be rolled back.
- [x] AC-3: An integration test searches every table and `DATA_DIR/uploads` for the erased name and finds 0 occurrences; the `EMPLOYEE_ERASE` audit row contains only the former ID.

## Dates

- Created:      2026-10-15 11:45 UTC
- Last updated: 2026-10-16 15:00 UTC
- Completed:    2026-10-16 15:00 UTC
