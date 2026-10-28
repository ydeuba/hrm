# ADR-004: Store scores as integer hundredths with an explicit cell status

_Source of truth: [architecture.md](../architecture.md) — extracted 2026-10-15._

- **Status**: Accepted
- **Context**: Scores have 2 decimals (0.00–10.00). Cells can be RUN or N/A, which must never count as 0. Float storage causes drift (e.g. 8.33 + 8.67), and Decimal support differs between SQLite and PostgreSQL.
- **Decision**: The `Score` row stores `status ∈ {SCORED, RUN, NOT_SCORED}` and `valueCenti: Int?` (0–1000; required only when SCORED). The domain converts to `number` at the edge, computes totals in integer hundredths and averages as floats, and rounds only for display (2 dp). Missing rows mean the employee was not part of that sprint.
- **Consequences**: Exact, portable arithmetic and a lossless round-trip with the sheet for 2-dp values. Values with more than 2 dp are rounded half-up on import with a warning (see ADR-016; the sample file has one such cell, `E44 = 5.975`). The UI and exports must always go through the domain formatters. A check constraint (validated in the application and covered by tests) enforces that `valueCenti` is present exactly when the status is SCORED.
