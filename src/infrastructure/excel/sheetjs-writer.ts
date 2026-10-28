import 'server-only';
import * as XLSX from 'xlsx';
import type { SheetRows, SpreadsheetWriter } from '@/application/ports/spreadsheet';

/** Leading characters that make spreadsheet apps treat text as a formula (CSV/formula injection). */
const DANGEROUS = /^[=+\-@\t\r]/;

/** Prefix risky text with an apostrophe so it is always shown literally (US-07-02 AC-2). */
export function escapeCell(value: string | number | null): string | number | null {
  return typeof value === 'string' && DANGEROUS.test(value) ? `'${value}` : value;
}

const BOM = String.fromCharCode(0xfeff);

/** SheetJS writer (ADR-008): xlsx workbooks or UTF-8 CSV with BOM; every text cell is escaped. */
export class SheetJsWriter implements SpreadsheetWriter {
  write(sheets: readonly { name: string; rows: SheetRows }[], format: 'xlsx' | 'csv'): Uint8Array {
    const wb = XLSX.utils.book_new();
    for (const s of sheets) {
      const safe = s.rows.map((row) => row.map(escapeCell));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(safe), s.name.slice(0, 31));
    }
    if (format === 'csv') {
      const first = wb.Sheets[wb.SheetNames[0] ?? ''];
      const csv = first ? XLSX.utils.sheet_to_csv(first) : '';
      return new TextEncoder().encode(`${BOM}${csv}`);
    }
    return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx', compression: true }) as ArrayBuffer);
  }
}
