# ADR-014: Quality gates — Vitest, Playwright and fixture-driven golden tests

_Source of truth: [architecture.md](../architecture.md) — extracted 2026-10-15._

- **Status**: Accepted
- **Context**: The aaid gates require ≥ 80% coverage, unit and integration tests, 0 lint errors and complexity ≤ 10. BO-2 requires proof of 100% calculation accuracy.
- **Decision**: **Vitest** for domain unit tests (100% branch coverage on `src/domain`), and for application and integration tests against a temporary SQLite database per test file (`prisma migrate reset` into a temp `DATA_DIR`). **Golden tests** (all asserted to ±0.01):
  - `tests/fixtures/kpi-master-sheet.xlsx` (a copy of the sample): per-engineer totals and averages, **overall ranks taken from the Compile Sheet "Overall Rankings" block**, last-N averages from Sheet1, and the Performance Insights team, designation and trend figures.
  - `tests/fixtures/reference-s122-s135.json` (from the HTML `RAW`): **only** total, average, last-3, prior-3, momentum, best/worst, spread and band. Its `rank` field is **not** asserted, because those ranks were copied from an older sheet and don't follow the averages (e.g. Jeevan Joshi 9.07 → rank 42). This is recorded as a known difference.

  **Performance tests:**
  - Vitest `bench` and threshold tests: `computeDashboard` on a synthetic 500 × 200 dataset ≤ 100 ms.
  - Parse and diff of a generated 200-row, about 5 MB workbook ≤ 5 s.
  - Playwright: filter change to repaint ≤ 300 ms.

  **Playwright** also covers e2e: login → import → dashboard → profile → export. ESLint uses `complexity: ["error", 10]` and boundary rules. `npm run verify` runs typecheck, lint, test and build.
- **Consequences**: High confidence in the numbers Management relies on, and no test that tries to reproduce a broken legacy ranking. Golden files must be updated deliberately whenever business rules change, and that update is reviewed.
