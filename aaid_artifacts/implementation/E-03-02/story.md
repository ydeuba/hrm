---
story_id: E-03-02
epic_id: E-03
sprint: SPRINT-003
status: done
story_points: 5
completed_at: 2026-10-16T04:24:44.212Z
---

# E-03-02: Edit employee with aliases & field locks

| Field | Value |
|---|---|
| Epic | E-03 — Employee, Team & Sprint Master Data |
| Sprint | SPRINT-003 |
| Status | **done** |
| Story points | 5 |

## User Story

**As a** HR Admin
**I want** to correct an employee's details
**so that** records stay accurate and my corrections survive future imports

## Acceptance Criteria

- [x] AC-1: Given I change the display name, then the old normalised name stays an alias, and re-importing with the old spelling still matches this employee.
- [x] AC-2: Given I change team or designation, then the corresponding lock is set; a later import with a different value doesn't overwrite it and the preview shows `LOCKED_FIELD_DIFFERS`.
- [x] AC-3: Given "Unlock", then the next import may update the field again.
- [x] AC-4: Given setting status to Inactive, then the employee disappears from default dashboard views but appears with "include inactive".
- [x] AC-5: Every change is audited with before and after values (`EMPLOYEE_UPDATE`).

## Dates

- Created:      2026-10-15 11:45 UTC
- Last updated: 2026-10-16 04:24 UTC
- Completed:    2026-10-16 04:24 UTC
