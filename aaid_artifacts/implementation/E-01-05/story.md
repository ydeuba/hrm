---
story_id: E-01-05
epic_id: E-01
sprint: SPRINT-003
status: done
story_points: 2
completed_at: 2026-10-16T01:55:34.876Z
---

# E-01-05: Change password

| Field | Value |
|---|---|
| Epic | E-01 — HR Admin Authentication & Access |
| Sprint | SPRINT-003 |
| Status | **done** |
| Story points | 2 |

## User Story

**As a** HR Admin
**I want** to change my password
**so that** I can rotate credentials

## Acceptance Criteria

- [x] AC-1: Given the correct current password and a new password of ≥ 12 characters, then the password changes, all other sessions are revoked, and `AUTH_PASSWORD_CHANGE` is audited.
- [x] AC-2: Given a wrong current password, then 401 and nothing changes.
- [x] AC-3: Given a new password equal to the current one or shorter than 12 characters, then 400 `WEAK_PASSWORD`.

## Dates

- Created:      2026-10-15 11:45 UTC
- Last updated: 2026-10-16 01:55 UTC
- Completed:    2026-10-16 01:55 UTC
