# E-04-03 — Rankings with exact-precision comparison · Implementation record

## Files
- `src/domain/kpi/ranking.ts`: `rankAll`, `rankByGroup`, `compareAverageDesc` (integer cross-product), `compareForDisplay`.
- `src/domain/kpi/window.ts`: `lastNWindow`, `sliceDataset`, `rangeOf`.

## Important finding (ADR-016 amended)
The workbook gives the **same rank number to equal exact averages even when totals differ**. In the last-6 ranking, Sajjan (49.00 over 5 sprints) and Ashika (9.80 over 1 sprint) both hold rank 2. Rank numbers are therefore competition ranks on the exact average alone, and total desc then name only decides the display order within a tie. This differs from the wording of requirements US-04-04 AC-1 ("ties on both Average and Total share a rank"), but matches the sheet, which this story's AC-1 makes authoritative. I amended ADR-016.

## Acceptance criteria status
- [x] AC-1: satisfied — overall ranks equal the Compile Sheet "Overall Rankings" for all 49 employees (golden test); Mandip ranks above Sajjan.
- [x] AC-2: satisfied — competition ranking 1, 2, 2, 4 (boundary fixture), including ties with different totals.
- [x] AC-3: satisfied — `rankByGroup` restarts ranks per designation; engineers below `minSprints` get `eligible=false, rank=null`.
- [x] AC-4: satisfied — `lastNWindow(6)` returns S133–S138, skipping the empty S139–S141; last-N averages, counts and ranks match the workbook for all 49.
