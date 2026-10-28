# E-04-07 — Performance benchmarks · Implementation record

## Implementation
- `tests/perf/compute-dashboard.perf.test.ts`, `tests/perf/import-preview.perf.test.ts`, and the existing `dataset.perf.test.ts`; documented in the README.

## Acceptance criteria status
- [x] AC-1: satisfied — computeDashboard at 500×200: p95 40 ms (threshold 100 ms).
- [x] AC-2: satisfied — a generated 200-row, 200-sprint, 4.7 MB workbook previews (parse + interpret + validate + diff + store) in 0.8 s (threshold 5 s).
- [x] AC-3: satisfied — `npm run test:perf`; the README records the thresholds, the results and the machine spec (i7-13620H, 32 GB).
