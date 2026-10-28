---
story_id: E-00-04
epic_id: E-00
sprint: SPRINT-001
status: done
story_points: 3
completed_at: 2026-10-15T14:46:32.021Z
---

# E-00-04: Composition root, env validation & HTTP plumbing

| Field | Value |
|---|---|
| Epic | E-00 — Platform Foundation |
| Sprint | SPRINT-001 |
| Status | **done** |
| Story points | 3 |

## User Story

**As a** developer
**I want** `container.ts`, Zod-validated env, the `withHandler` wrapper, the error envelope and structured logging
**so that** every endpoint is thin, consistent and safe by default

## Acceptance Criteria

- [x] AC-1: Given an invalid or missing required env var, when the app starts, then it exits with a message naming the variable.
- [x] AC-2: Given a handler wrapped with `withHandler({ body: schema })`, when the body is invalid, then it returns `400 { error: { code: 'VALIDATION_FAILED', details } }`.
- [x] AC-3: Given an unexpected exception, then the response is `500 { error: { code: 'INTERNAL', message, correlationId } }` and the log line contains the same correlation ID but no request body.
- [x] AC-4: Given a non-GET request whose `Origin` doesn't match the host or `TRUSTED_ORIGINS`, then it returns 403 `CSRF_ORIGIN_MISMATCH`.

## Dates

- Created:      2026-10-15 11:45 UTC
- Last updated: 2026-10-15 14:46 UTC
- Completed:    2026-10-15 14:46 UTC
