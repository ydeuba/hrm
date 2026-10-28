---
story_id: E-01-02
epic_id: E-01
sprint: SPRINT-001
status: done
story_points: 3
completed_at: 2026-10-15T15:13:27.335Z
---

# E-01-02: Two-gate route protection

| Field | Value |
|---|---|
| Epic | E-01 — HR Admin Authentication & Access |
| Sprint | SPRINT-001 |
| Status | **done** |
| Story points | 3 |

## User Story

**As a** HR Admin
**I want** every page and API protected on the server
**so that** data can't be reached by skipping the login screen

## Acceptance Criteria

- [x] AC-1: Given no cookie, when I request any page except `/login`, then I am redirected to `/login?next=<path>`; any `/api/*` except login and health returns 401.
- [x] AC-2: Given a cookie with an unknown, expired or revoked token, when I request a page, then `requireSession()` deletes the session row (if any) and redirects to `/login`.
- [x] AC-3: An automated test enumerates every route under `src/app` and asserts 401 or redirect without a session (the test fails when a new route forgets `requireSession()`).

## Dates

- Created:      2026-10-15 11:45 UTC
- Last updated: 2026-10-15 15:13 UTC
- Completed:    2026-10-15 15:13 UTC
