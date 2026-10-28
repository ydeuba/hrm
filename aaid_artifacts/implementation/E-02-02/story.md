---
story_id: E-02-02
epic_id: E-02
sprint: SPRINT-002
status: done
story_points: 5
completed_at: 2026-10-15T16:06:03.618Z
---

# E-02-02: Sheet & header detection

| Field | Value |
|---|---|
| Epic | E-02 — Excel KPI Import & Validation |
| Sprint | SPRINT-002 |
| Status | **done** |
| Story points | 5 |

## User Story

**As a** HR Admin
**I want** the system to find the right sheet and columns automatically
**so that** I can upload the workbook exactly as HR maintains it

## Acceptance Criteria

- [x] AC-1: Given the sample workbook, then the sheet named `"Compile Sheet "` (trimmed match) is chosen, the header is found on row 1, and sprints S122–S138 are detected; S139–S141 are ignored because they are empty.
- [x] AC-2: Given a workbook without a Compile Sheet, then the first sheet whose first 10 rows contain "Designation" and an `^S\d+$` column is used, and the preview names it.
- [x] AC-3: Given no such header, then 400 `IMPORT_NO_HEADER` with guidance text.
- [x] AC-4: Given an optional "Code" or "Employee Code" column, then it is mapped (ADR-018). The ranking blocks, the helper columns, and the Performance Insights and Sheet1 sheets are ignored.

## Dates

- Created:      2026-10-15 11:45 UTC
- Last updated: 2026-10-15 16:06 UTC
- Completed:    2026-10-15 16:06 UTC
