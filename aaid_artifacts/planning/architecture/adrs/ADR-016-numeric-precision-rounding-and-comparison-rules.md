# ADR-016: Numeric precision, rounding and comparison rules

_Source of truth: [architecture.md](../architecture.md) — extracted 2026-10-15._

- **Status**: Accepted
- **Context**: Review findings #1 and #11. The sheet ranks on exact averages (Mandip at 9.00 is ranked above Sajjan, who shows 9.00 but is actually 8.9956). The reference HTML assigns bands on the 2-dp average. One sample cell has 3 dp (`5.975`). Naive float rounding is wrong for 68 of the 1,000 possible 3-dp half values (e.g. `1.005 × 100 = 100.4999…`). *Corrected 2026-10-15:* `5.975` itself rounds correctly to 598.
- **Decision**:
  1. **Ingest**: `centi = Math.round(v * 100 + 1e-7)` (half-up). If `|v*100 − round(v*100)| > 1e-9`, emit a `PRECISION_ROUNDED` warning naming the cell.
  2. **Totals** are integer sums of centi values.
  3. **Ranking** compares exact averages as integer cross-products, `totalCentiA × nB` vs `totalCentiB × nA`, with no floats. **Rank numbers** are competition ranks on the exact average alone, so equal exact averages share a rank (1, 2, 2, 4) even when totals differ. *Amended 2026-10-15 from workbook evidence:* in the last-6 ranking, Sajjan (49.00/5) and Ashika (9.80/1) both hold rank 2. **Display order** within a tie is `totalCenti` desc, then name.
  4. **Bands** use the average rounded half-up to 2 dp (`Math.round(totalCenti / n + 1e-9) / 100`), which is exactly the value users see.
  5. **Display**: always 2 dp. When two adjacent rows display the same average but have different ranks, the tooltip shows 3 dp.
  6. **Momentum, last-3 and spread** are computed on the exact values and rounded to 2 dp for display only.
- **Consequences**: Rankings match the sheet exactly, and the rating always agrees with the number shown. The golden tests cover both boundary cases (7.995 → Outstanding; 9.00 vs 8.9956 ordering).
