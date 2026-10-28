# E-04-04 — Group aggregates & sprint trend · Implementation record

## Files
`src/domain/kpi/groups.ts`: `aggregateBy` (people, score observations, total, weighted average, rank), `sprintTrend` (average, participants, coverage), `overallWeightedAverage`.

## Acceptance criteria status
- [x] AC-1: satisfied — all 8 team summaries match Performance Insights (e.g. DevOps 7 people, 41 observations, 8.97, rank 1).
- [x] AC-2: satisfied — all 4 designation summaries match (e.g. ASE 20 people, 197 observations, 7.64).
- [x] AC-3: satisfied — the trend average and participants match for S122–S138 (S138: 8.41 with 47); sprints with no scores give `null`, not 0.
- [x] AC-4: satisfied — coverage = participants ÷ population, so S138 = 47/49 = 95.9%; the overall weighted average matches the headline 7.78.
