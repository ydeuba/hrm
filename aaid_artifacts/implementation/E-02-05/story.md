---
story_id: E-02-05
epic_id: E-02
sprint: SPRINT-002
status: done
story_points: 5
completed_at: 2026-10-15T16:16:52.430Z
---

# E-02-05: Import preview screen

| Field | Value |
|---|---|
| Epic | E-02 — Excel KPI Import & Validation |
| Sprint | SPRINT-002 |
| Status | **done** |
| Story points | 5 |

## User Story

**As a** HR Admin
**I want** a clear preview before anything is saved
**so that** I can catch mistakes in the sheet first

## Acceptance Criteria

- [x] AC-1: Given an uploaded file, when the preview loads, then I see the sheet used, the sprint range, summary counts, and tabs for New employees, Changes, Scores, Warnings and Errors.
- [x] AC-2: Given near-duplicates, then each has a "Same person" checkbox, and unchecked ones are labelled "will be created as new".
- [x] AC-3: Given errors, then "Confirm import" is disabled and the errors list their row and column; given only warnings, then it is enabled.
- [x] AC-4: Given I click "Discard", then the batch is DISCARDED and I return to the upload step; previews older than 30 minutes show "expired, upload again".
- [x] AC-5: Given the same file hash as the last committed batch, then a notice says "This file was already imported on <date>".

## Dates

- Created:      2026-10-15 11:45 UTC
- Last updated: 2026-10-15 16:16 UTC
- Completed:    2026-10-15 16:16 UTC
