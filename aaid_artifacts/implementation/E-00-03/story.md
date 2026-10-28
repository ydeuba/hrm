---
story_id: E-00-03
epic_id: E-00
sprint: SPRINT-001
status: done
story_points: 5
completed_at: 2026-10-15T14:41:16.789Z
---

# E-00-03: Database schema & migrations

| Field | Value |
|---|---|
| Epic | E-00 — Platform Foundation |
| Sprint | SPRINT-001 |
| Status | **done** |
| Story points | 5 |

## User Story

**As a** developer
**I want** the full Prisma schema and initial migration for every entity in the data model
**so that** features don't trigger repeated schema churn

## Acceptance Criteria

- [x] AC-1: Given an empty `DATA_DIR`, when I run `prisma migrate deploy`, then all 18 tables from the architecture's Data Model Overview exist with their indexes and unique constraints.
- [x] AC-2: Given app start, when the Prisma client connects, then `PRAGMA journal_mode` returns `wal` and `foreign_keys` returns `1`.
- [x] AC-3: Given the seed script, when run, then designations Team Lead/SSE/SE/ASE (with CANONICAL aliases and sort orders 1–4), the `SystemState` row (revisions 0/0) and the default `AppSettings` exist, and re-running creates no duplicates.
- [x] AC-4: An integration test helper creates an isolated temporary database per test file.

## Dates

- Created:      2026-10-15 11:45 UTC
- Last updated: 2026-10-15 14:41 UTC
- Completed:    2026-10-15 14:41 UTC
