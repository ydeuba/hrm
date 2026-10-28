import 'server-only';
import * as XLSX from 'xlsx';
import type { SpreadsheetReader } from '@/application/ports/spreadsheet';
import type { RawCell } from '@/domain/import/cell-parser';
import type { SheetInput } from '@/domain/import/master-sheet';
import type { UploadKind } from '@/domain/import/upload-policy';

const BOM = 0xfeff;
const stripBom = (text: string) => (text.charCodeAt(0) === BOM ? text.slice(1) : text);

/**
 * SheetJS adapter (ADR-008): reads cached values only (formulas are never
 * evaluated; external-workbook links keep their stored value). CSV is read as
 * text so numeric strings are interpreted by the domain parser.
 */
export class SheetJsReader implements SpreadsheetReader {
  read(bytes: Uint8Array, kind: UploadKind): SheetInput[] {
    const options = { cellFormula: false, cellHTML: false, cellStyles: false, sheetStubs: false, dense: true } as const;
    const wb = kind === 'csv' ? XLSX.read(stripBom(new TextDecoder('utf-8').decode(bytes)), { ...options, type: 'string', raw: true }) : XLSX.read(bytes, { ...options, type: 'array' });
    return wb.SheetNames.flatMap((name) => {
      const ws = wb.Sheets[name];
      if (!ws) return [];
      const grid = XLSX.utils.sheet_to_json<RawCell[]>(ws, { header: 1, raw: true, defval: null, blankrows: true });
      return [{ name, grid }];
    });
  }
}
