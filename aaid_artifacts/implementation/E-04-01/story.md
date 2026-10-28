---
story_id: E-04-01
epic_id: E-04
sprint: SPRINT-001
status: done
story_points: 5
completed_at: 2026-10-15T15:45:35.004Z
---

# E-04-01: Per-engineer metrics

| Field | Value |
|---|---|
| Epic | E-04 — KPI Calculation Engine |
| Sprint | SPRINT-001 |
| Status | **done** |
| Story points | 5 |

## User Story

**As a** Management
**I want** each engineer's total, average, last 3, prior 3, momentum, best, worst and variability computed by one rule set
**so that** every figure in an appraisal is consistent

## Acceptance Criteria

- [x] AC-1: Given cells containing RUN and NOT_SCORED, when metrics are computed, then those cells are excluded from every metric and `runSprints` counts the RUN cells.
- [x] AC-2: Given fewer than `momentumMinSprints` (6) scored sprints, then momentum is null; with ≥ 6, momentum = mean(last 3) − mean(prior 3).
- [x] AC-3: Given the reference S122–S135 fixture, then every engineer's total, average, last-3, prior-3, momentum, best, worst and spread match `reference-s122-s135.json` to ±0.01.
- [x] AC-4: The module has no imports outside `src/domain` and has 100% branch coverage.

## Dates

- Created:      2026-10-15 11:45 UTC
- Last updated: 2026-10-15 15:45 UTC
- Completed:    2026-10-15 15:45 UTC
