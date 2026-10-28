import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import expected from '../../../fixtures/expected-workbook.json';
import { parseCell, parseOptionalNumber } from '@/domain/import/cell-parser';
import { dataCheckIssues } from '@/domain/import/data-check';
import { locateHeader } from '@/domain/import/header-locator';
import { hasErrors } from '@/domain/import/issues';
import { chooseSheet, interpretMasterSheet, type SheetInput } from '@/domain/import/master-sheet';
import { SheetJsReader } from '@/infrastructure/excel/sheetjs-reader';

const workbookBytes = new Uint8Array(readFileSync(path.resolve(__dirname, '../../../fixtures/kpi-master-sheet.xlsx')));
const reader = new SheetJsReader();
const sheetsOf = (grid: (string | number | null)[][], name = 'Data'): SheetInput[] => [{ name, grid }];

describe('real KPI Master Sheet (E-02-02 AC-1, E-02-03)', () => {
  const sheets = reader.read(workbookBytes, 'xlsx');
  const result = interpretMasterSheet(sheets);
  if (!result.ok) throw new Error('interpretation failed');
  const { sheet, issues } = result.value;

  it('chooses "Compile Sheet " with the header on row 1 and S122–S138 (S139–S141 empty)', () => {
    expect(sheets.map((s) => s.name)).toEqual(['Compile Sheet ', 'Performance Insights', 'Sheet1']);
    expect(sheet.sheetName).toBe('Compile Sheet ');
    expect(sheet.headerRow).toBe(1);
    expect(sheet.sprints).toEqual(expected.sprints);
    expect(sheet.emptySprints).toEqual(['S139', 'S140', 'S141']);
  });

  it('parses all 49 employees and 560 scored cells; skips section rows', () => {
    expect(sheet.rows).toHaveLength(49);
    expect(sheet.rows.some((r) => ['TEAM LEAD', 'SSE', 'SE', 'ASE'].includes(r.name))).toBe(false);
    expect(sheet.rows.flatMap((r) => r.cells).filter((c) => c.kind === 'scored')).toHaveLength(560);
    for (const e of expected.employees) {
      const row = sheet.rows.find((r) => r.name === e.name.replace(/\s+/g, ' '));
      expect(row, e.name).toBeDefined();
      const cells = expected.sprints.map((s) => (e.cells as Record<string, number | string>)[s]);
      const kinds = row?.cells.map((c) => c.kind);
      expect(kinds).toEqual(cells.map((v) => (typeof v === 'number' ? 'scored' : v === 'RUN' ? 'run' : 'none')));
      expect([row?.team, row?.designation, row?.sheetTotal, row?.sheetAverage]).toEqual([e.team, e.designation, e.sheetTotal, e.sheetAverage]);
    }
  });

  it('normalises names ("Niva  Awale" → display "Niva Awale", key "niva awale")', () => {
    const niva = sheet.rows.find((r) => r.normalisedName === 'niva awale');
    expect(niva?.name).toBe('Niva Awale');
  });

  it('raises exactly one PRECISION_ROUNDED warning (E44 = 5.975) and no errors', () => {
    expect(hasErrors(issues)).toBe(false);
    expect(issues).toEqual([
      expect.objectContaining({ severity: 'warning', code: 'PRECISION_ROUNDED', row: 44, column: 'S122', employeeName: 'Bishal Joshi' }),
    ]);
    const bishal = sheet.rows.find((r) => r.name === 'Bishal Joshi');
    expect(bishal?.cells[0]).toEqual({ kind: 'scored', centi: 598 });
  });

  it('E-02-06 AC-3: the unmodified sample has zero average/total mismatches', () => {
    expect(dataCheckIssues(sheet, { average: 0.02, total: 0.05 })).toEqual([]);
  });

  it('E-02-06 AC-1/AC-2: an edited Average or Total produces exactly one warning each', () => {
    const tampered = { ...sheet, rows: sheet.rows.map((r) => (r.name === 'Niba Tandukar' ? { ...r, sheetAverage: 9.9, sheetTotal: 99 } : r)) };
    const found = dataCheckIssues(tampered, { average: 0.02, total: 0.05 });
    expect(found.map((i) => [i.code, i.employeeName, i.sheetValue, i.computedValue])).toEqual([
      ['AVG_MISMATCH', 'Niba Tandukar', 9.9, 9.53],
      ['TOTAL_MISMATCH', 'Niba Tandukar', 99, 95.26],
    ]);
  });
});

describe('header & sheet selection (E-02-02)', () => {
  it('AC-2: falls back to the first sheet with a valid header and names it', () => {
    const sheets: SheetInput[] = [
      { name: 'Notes', grid: [['hello']] },
      { name: 'Scores', grid: [['', ''], ['Resources', 'Teams', 'Designation', 'S1', 'S2'], ['A', 'T', 'SE', 9, 'RUN']] },
    ];
    const r = chooseSheet(sheets);
    expect(r.ok && r.value.sheet.name).toBe('Scores');
    expect(r.ok && r.value.header.row).toBe(1);
  });

  it('AC-3: no header within 10 rows → IMPORT_NO_HEADER', () => {
    const grid = [...Array.from({ length: 10 }, () => ['x']), ['Resources', 'Designation', 'S1']];
    expect(interpretMasterSheet(sheetsOf(grid))).toEqual({ ok: false, error: 'IMPORT_NO_HEADER' });
    expect(locateHeader([['Designation', 'Name']]).ok).toBe(false);
    expect(locateHeader([['Designation', 'S1']]).ok).toBe(false);
  });

  it('AC-4: maps optional Code, ignores duplicate sprint headers, tolerates case/whitespace', () => {
    const h = locateHeader([[' resources ', 'DESIGNATION', 'Employee Code', 's5', 'S5', 'Average']]);
    expect(h.ok && h.value).toMatchObject({ name: 0, designation: 1, code: 2, team: null, total: null, average: 5, sprints: [{ col: 3, code: 'S5' }] });
  });
});

describe('cell parsing (E-02-03)', () => {
  it('AC-1: scores, RUN and not-scored markers', () => {
    expect(parseCell(8.33)).toEqual({ ok: true, cell: { kind: 'scored', centi: 833 }, rounded: false });
    expect(parseCell(' 7.5 ')).toEqual({ ok: true, cell: { kind: 'scored', centi: 750 }, rounded: false });
    expect(parseCell('run')).toEqual({ ok: true, cell: { kind: 'run' }, rounded: false });
    for (const v of ['N/A', 'na', '-', '', '  ', '#DIV/0!', '#REF!', null, undefined]) {
      expect(parseCell(v), String(v)).toEqual({ ok: true, cell: { kind: 'none' }, rounded: false });
    }
    expect(parseCell(5.975)).toEqual({ ok: true, cell: { kind: 'scored', centi: 598 }, rounded: true });
  });

  it('AC-2: out-of-range and non-numeric values are errors', () => {
    expect(parseCell(10.5)).toMatchObject({ ok: false, code: 'OUT_OF_RANGE' });
    expect(parseCell(-1)).toMatchObject({ ok: false, code: 'OUT_OF_RANGE' });
    expect(parseCell('11')).toMatchObject({ ok: false, code: 'OUT_OF_RANGE' });
    expect(parseCell(Number.NaN)).toMatchObject({ ok: false, code: 'OUT_OF_RANGE' });
    expect(parseCell('absent')).toEqual({ ok: false, code: 'NON_NUMERIC', raw: 'absent' });
    expect(parseCell(true)).toMatchObject({ ok: false, code: 'NON_NUMERIC' });
  });

  it('optional numbers', () => {
    expect(parseOptionalNumber(7.2)).toBe(7.2);
    expect(parseOptionalNumber('7.20')).toBe(7.2);
    expect(parseOptionalNumber('-')).toBeNull();
    expect(parseOptionalNumber(null)).toBeNull();
    expect(parseOptionalNumber(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it('AC-2/AC-3/AC-4: row errors, skipped rows, duplicates and dropped empty sprints', () => {
    const grid = [
      ['S.N', 'Resources', 'Teams', 'Designation', 'S1', 'S2', 'S3', 'Total', 'Average'],
      ['', 'SSE', '', '', '', '', '', '', ''],
      [1, 'Asha  Rai', 'T1', 'SE', 9, 'abc', null, 9, 9],
      [2, 'Bina', 'T1', '', 8, 8, null, '', ''],
      [3, '', 'T1', 'SE', 8, 8, null, '', ''],
      [4, 'asha rai', 'T2', 'ASE', 12, 'RUN', null, '', '-'],
    ];
    const r = interpretMasterSheet(sheetsOf(grid));
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.sheet.rows.map((x) => x.name)).toEqual(['Asha Rai', 'asha rai']);
    expect(r.value.sheet.sprints).toEqual(['S1']);
    expect(r.value.sheet.emptySprints).toEqual(['S2', 'S3']);
    expect(r.value.issues.map((i) => [i.code, i.row, i.column])).toEqual([
      ['NON_NUMERIC', 3, 'S2'],
      ['OUT_OF_RANGE', 6, 'S1'],
      ['DUPLICATE_NAME', 6, null],
    ]);
    expect(hasErrors(r.value.issues)).toBe(true);
    expect(r.value.sheet.rows[1]?.sheetAverage).toBeNull();
  });

  it('with a Code column, duplicates are judged by code; team column is optional', () => {
    const grid = [
      ['Code', 'Name', 'Designation', 'S1'],
      ['E1', 'Same Name', 'SE', 8],
      ['E2', 'Same Name', 'SE', 7],
      ['e1', 'Other', 'SE', 6],
    ];
    const r = interpretMasterSheet(sheetsOf(grid));
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.sheet.rows[0]).toMatchObject({ code: 'E1', team: '' });
    expect(r.value.issues.map((i) => [i.code, i.row])).toEqual([['DUPLICATE_NAME', 4]]);
  });

  it('data check ignores rows without scores or sheet values', () => {
    const r = interpretMasterSheet(sheetsOf([['Resources', 'Designation', 'S1', 'S2'], ['A', 'SE', 'RUN', 'N/A'], ['B', 'SE', 8, 'x']]));
    if (!r.ok) throw new Error('expected ok');
    expect(dataCheckIssues(r.value.sheet, { average: 0.02, total: 0.05 })).toEqual([]);
  });
});

describe('CSV input', () => {
  it('reads UTF-8 CSV (with BOM) as text and interprets numeric strings', () => {
    const csv = '﻿Resources,Teams,Designation,S10,S11\nRam,DevOps,SE,8.5,RUN\n';
    const sheets = reader.read(new TextEncoder().encode(csv), 'csv');
    const r = interpretMasterSheet(sheets);
    expect(r.ok && r.value.sheet.rows[0]?.cells).toEqual([{ kind: 'scored', centi: 850 }]);
  });

  it('reads workbooks written by SheetJS', () => {
    const ws = XLSX.utils.aoa_to_sheet([['Resources', 'Designation', 'S1'], ['A', 'SE', 7]]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Compile Sheet');
    const bytes = new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer);
    expect(interpretMasterSheet(reader.read(bytes, 'xlsx')).ok).toBe(true);
  });
});
