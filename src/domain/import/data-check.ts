import { scoredCenti } from '../kpi/score-cell';
import type { ImportIssueDraft } from './issues';
import type { ParsedMasterSheet } from './master-sheet';

export interface DataCheckTolerances {
  readonly average: number;
  readonly total: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Compare the sheet's own Total / Average columns with values recomputed from
 * the sprint cells (US-02-04). Mismatches are warnings: they reveal broken
 * spreadsheet formulas but never block the import.
 */
export function dataCheckIssues(sheet: ParsedMasterSheet, tol: DataCheckTolerances): ImportIssueDraft[] {
  return sheet.rows.flatMap((r) => {
    const centi = scoredCenti(r.cells);
    if (centi.length === 0) return [];
    const total = centi.reduce((a, b) => a + b, 0) / 100;
    const average = total / centi.length;
    const out: ImportIssueDraft[] = [];
    if (r.sheetAverage !== null && Math.abs(r.sheetAverage - average) > tol.average) {
      out.push({
        severity: 'warning', code: 'AVG_MISMATCH', row: r.rowNumber, column: 'Average', employeeName: r.name,
        message: `${r.name}: sheet average ${r.sheetAverage.toFixed(2)} ≠ recalculated ${average.toFixed(2)}`,
        sheetValue: round2(r.sheetAverage), computedValue: round2(average),
      });
    }
    if (r.sheetTotal !== null && Math.abs(r.sheetTotal - total) > tol.total) {
      out.push({
        severity: 'warning', code: 'TOTAL_MISMATCH', row: r.rowNumber, column: 'Total', employeeName: r.name,
        message: `${r.name}: sheet total ${r.sheetTotal.toFixed(2)} ≠ recalculated ${total.toFixed(2)}`,
        sheetValue: round2(r.sheetTotal), computedValue: round2(total),
      });
    }
    return out;
  });
}
