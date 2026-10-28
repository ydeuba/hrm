---
story_id: E-01-01
epic_id: E-01
sprint: SPRINT-001
status: done
story_points: 5
completed_at: 2026-10-15T15:13:25.460Z
---

# E-01-01: Login with lockout

| Field | Value |
|---|---|
| Epic | E-01 — HR Admin Authentication & Access |
| Sprint | SPRINT-001 |
| Status | **done** |
| Story points | 5 |

## User Story

**As a** HR Admin
**I want** to sign in with my email and password
**so that** only authorised HR staff can see employee performance data

## Acceptance Criteria

- [x] AC-1: Given valid credentials, when I submit `/login`, then I land on `/dashboard` and an `hrm_session` cookie is set (httpOnly, SameSite=Lax, Max-Age 12 h, Secure on HTTPS).
- [x] AC-2: Given wrong credentials, or an email that doesn't exist, then I see "Invalid email or password", the response time is within ±50 ms of a valid-email failure (dummy-hash verify), and an `AUTH_LOGIN_FAIL` audit row is written.
- [x] AC-3: Given 5 failures for one email within 15 minutes, when I try again (even with the correct password), then I get 429 with a retry time and a lockout message, and the lockout lasts 15 minutes from the 5th failure.
- [x] AC-4: Given a successful login, then the throttle counter for that email resets.

## Dates

- Created:      2026-10-15 11:45 UTC
- Last updated: 2026-10-15 15:13 UTC
- Completed:    2026-10-15 15:13 UTC
