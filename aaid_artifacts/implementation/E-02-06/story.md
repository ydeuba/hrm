---
story_id: E-02-06
epic_id: E-02
sprint: SPRINT-002
status: done
story_points: 3
completed_at: 2026-10-16T01:50:40.333Z
---

# E-02-06: Data-quality warnings

| Field | Value |
|---|---|
| Epic | E-02 — Excel KPI Import & Validation |
| Sprint | SPRINT-002 |
| Status | **done** |
| Story points | 3 |

## User Story

**As a** HR Admin
**I want** sheet formula errors flagged
**so that** I can fix the source spreadsheet

## Acceptance Criteria

- [x] AC-1: Given a row whose sheet Average differs from the recalculated average by more than 0.02, then an `AVG_MISMATCH` warning shows the name, sheet value and computed value.
- [x] AC-2: Given a sheet Total differing by more than 0.05, then a `TOTAL_MISMATCH` warning.
- [x] AC-3: Given the unmodified sample workbook, then there are 0 AVG/TOTAL mismatches (its formulas are consistent); a fixture with one edited Average produces exactly one warning.

## Dates

- Created:      2026-10-15 11:45 UTC
- Last updated: 2026-10-16 01:50 UTC
- Completed:    2026-10-16 01:50 UTC
