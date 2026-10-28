import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { escapeCell, SheetJsWriter } from '@/infrastructure/excel/sheetjs-writer';

describe('SheetJsWriter (E-07-02 AC-2)', () => {
  it.each(['=SUM(A1)', '+1', '-2+3', '@cmd', '\tx', '\rx'])('escapes formula-like text %j', (v) => {
    expect(escapeCell(v)).toBe(`'${v}`);
  });

  it('leaves numbers, nulls and plain text untouched', () => {
    expect(escapeCell(-5)).toBe(-5);
    expect(escapeCell(null)).toBeNull();
    expect(escapeCell('Bishal Joshi')).toBe('Bishal Joshi');
  });

  it('writes escaped text into xlsx so no cell becomes a formula', () => {
    const bytes = new SheetJsWriter().write([{ name: 'S', rows: [['=HYPERLINK("x")', 1]] }], 'xlsx');
    const ws = XLSX.read(bytes, { type: 'array' }).Sheets.S;
    expect(ws?.A1?.f).toBeUndefined();
    expect(ws?.A1?.v).toBe(`'=HYPERLINK("x")`);
    expect(ws?.B1?.v).toBe(1);
  });

  it('truncates sheet names to the 31-character Excel limit', () => {
    const bytes = new SheetJsWriter().write([{ name: 'x'.repeat(40), rows: [] }], 'xlsx');
    expect(XLSX.read(bytes, { type: 'array' }).SheetNames).toEqual(['x'.repeat(31)]);
  });
});
