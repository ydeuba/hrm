---
story_id: E-01-04
epic_id: E-01
sprint: SPRINT-001
status: done
story_points: 2
completed_at: 2026-10-15T15:13:31.296Z
---

# E-01-04: Session expiry & logout

| Field | Value |
|---|---|
| Epic | E-01 — HR Admin Authentication & Access |
| Sprint | SPRINT-001 |
| Status | **done** |
| Story points | 2 |

## User Story

**As a** HR Admin
**I want** idle sessions to expire and to be able to log out
**so that** an unattended laptop doesn't expose data

## Acceptance Criteria

- [x] AC-1: Given no activity for more than 65 minutes, when I interact, then I am redirected to `/login`.
- [x] AC-2: Given a session older than 12 hours, then it is rejected regardless of activity.
- [x] AC-3: Given I click "Log out", then the session row is deleted, the cookie is cleared, `AUTH_LOGOUT` is audited, and navigating back shows no data (pages are `Cache-Control: no-store`).

## Dates

- Created:      2026-10-15 11:45 UTC
- Last updated: 2026-10-15 15:13 UTC
- Completed:    2026-10-15 15:13 UTC
