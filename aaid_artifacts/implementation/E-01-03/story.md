---
story_id: E-01-03
epic_id: E-01
sprint: SPRINT-001
status: done
story_points: 2
completed_at: 2026-10-15T15:13:29.380Z
---

# E-01-03: Seed first HR Admin

| Field | Value |
|---|---|
| Epic | E-01 — HR Admin Authentication & Access |
| Sprint | SPRINT-001 |
| Status | **done** |
| Story points | 2 |

## User Story

**As a** installer
**I want** to create the first HR Admin from environment variables
**so that** no default password ever ships

## Acceptance Criteria

- [x] AC-1: Given `ADMIN_EMAIL` and `ADMIN_PASSWORD` (≥ 12 chars), when I run `npm run seed:admin`, then exactly one admin with an argon2id hash exists.
- [x] AC-2: Given the variables are missing or the password is too short, then the command exits non-zero with a clear message and creates nothing.
- [x] AC-3: Given an admin already exists with that email, then re-running neither duplicates the admin nor changes the password.

## Dates

- Created:      2026-10-15 11:45 UTC
- Last updated: 2026-10-15 15:13 UTC
- Completed:    2026-10-15 15:13 UTC
