---
story_id: E-07-02
epic_id: E-07
sprint: SPRINT-003
status: done
story_points: 3
completed_at: 2026-10-16T05:43:12.043Z
---

# E-07-02: Export engineer table to Excel/CSV

| Field | Value |
|---|---|
| Epic | E-07 — Reports & Export |
| Sprint | SPRINT-003 |
| Status | **done** |
| Story points | 3 |

## User Story

**As a** HR Admin
**I want** to export the filtered table
**so that** I can analyse it further in Excel

## Acceptance Criteria

- [x] AC-1: Given current filters, then the `.xlsx` contains exactly the visible rows and columns plus one column per sprint in range (`RUN` and `N/A` shown as text).
- [x] AC-2: Given a cell value starting with `=`, `+`, `-`, `@`, a tab or a carriage return, then it is escaped (prefixed with `'`).
- [x] AC-3: The filename is `cloudtech-kpi_<from>-<to>_<yyyymmdd>.xlsx`; `format=csv` returns UTF-8 CSV with a BOM.

## Dates

- Created:      2026-10-15 11:45 UTC
- Last updated: 2026-10-16 05:43 UTC
- Completed:    2026-10-16 05:43 UTC
