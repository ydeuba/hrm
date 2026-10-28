import type { SheetInput } from '@/domain/import/master-sheet';
import type { UploadKind } from '@/domain/import/upload-policy';

/** Reads cached cell values of every worksheet; never evaluates formulas (ADR-008). */
export interface SpreadsheetReader {
  read(bytes: Uint8Array, kind: UploadKind): SheetInput[];
}

export type SheetRows = readonly (readonly (string | number | null)[])[];

/** Writes workbooks for export; implementations escape formula-injection prefixes. */
export interface SpreadsheetWriter {
  write(sheets: readonly { name: string; rows: SheetRows }[], format: 'xlsx' | 'csv'): Uint8Array;
}
