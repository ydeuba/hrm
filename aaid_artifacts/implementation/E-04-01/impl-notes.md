# E-04-01 — Per-engineer metrics · Implementation record

Built together with E-04-02/03/04 as one pure-TypeScript KPI engine in `src/domain/kpi/` (no dependencies; also bundled for the browser).

## Files
- `score-cell.ts`: `ScoreCell` (scored centi | run | none), `toCenti` (half-up + epsilon), `hasExtraPrecision`.
- `sprint-code.ts`: parse, sort and compare `S###` codes numerically.
- `metrics.ts`: `computeEngineerMetrics(cells, settings)` → sprints, run sprints, total (exact centi sum), exact average, 2-dp `displayAverage`, last3, prior3, momentum, best, worst, spread (population SD) and band.
- `dataset.ts`: the `KpiDataset` / `EngineerSeries` plain-data types.
- Tests: `tests/unit/domain/kpi/golden.test.ts`, `kpi-units.test.ts`.

## Notes
- prior3 is defined from 4 scored sprints (average of up to 3 earlier scores) and momentum from `momentumMinSprints` (6), exactly as the reference HTML does.
- **Correction to the architecture review:** `5.975 × 100` evaluates to 597.5 in JavaScript, so it rounds correctly. Naive rounding is still wrong for 68 of the 1,000 possible 3-dp half values (e.g. 1.005), so the epsilon rule stays. I updated ADR-016, review.md and the fixture.

## Acceptance criteria status
- [x] AC-1: satisfied — RUN and not-scored cells are excluded from every metric; `runSprints` counts RUN cells (boundary tests).
- [x] AC-2: satisfied — momentum is null below 6 scored sprints and equals last3 − prior3 otherwise.
- [x] AC-3: satisfied — all 43 reference engineers match total, average, last3, prior3, momentum, best, worst, spread and band within ±0.01, and all 49 workbook employees match total, average and count.
- [x] AC-4: satisfied — no imports outside `src/domain`; 100% statements, branches, functions and lines for `src/domain`.
