---
story_id: E-00-06
epic_id: E-00
sprint: SPRINT-001
status: done
story_points: 3
completed_at: 2026-10-15T14:50:49.970Z
---

# E-00-06: Golden test fixtures

| Field | Value |
|---|---|
| Epic | E-00 — Platform Foundation |
| Sprint | SPRINT-001 |
| Status | **done** |
| Story points | 3 |

## User Story

**As a** developer
**I want** reference fixtures with expected KPI outputs
**so that** every calculation can be proven against the numbers Management already trusts

## Acceptance Criteria

- [x] AC-1: `tests/fixtures/kpi-master-sheet.xlsx` (a copy of the sample) and `expected-workbook.json` contain, per employee: total, average, sprints, overall rank (from the "Overall Rankings" block), and last-6 average and count; plus the Performance Insights team, designation and trend figures.
- [x] AC-2: `reference-s122-s135.json` contains the HTML `RAW` records with expected total, average, last-3, prior-3, momentum, best, worst, spread and band. **Rank is excluded** (ADR-014).
- [x] AC-3: A generator script reproduces the expected JSON from the workbook's cached values, and its output is committed.
- [x] AC-4: Boundary fixtures cover: an average of 7.995 (band Outstanding); exact 9.00 vs 8.9956 ordering; the `5.975` cell; RUN-only rows; a single-sprint engineer.

## Dates

- Created:      2026-10-15 11:45 UTC
- Last updated: 2026-10-15 14:50 UTC
- Completed:    2026-10-15 14:50 UTC
