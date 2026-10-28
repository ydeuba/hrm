import { NOT_SCORED, type ScoreCell } from '../kpi/score-cell';
import type { SprintCode } from '../kpi/sprint-code';
import { displayName, normaliseName } from '../shared/name';
import { err, ok, type Result } from '../shared/result';
import { parseCell, parseOptionalNumber, type RawCell } from './cell-parser';
import { locateHeader, type HeaderMap, type RawGrid } from './header-locator';
import type { ImportIssueDraft } from './issues';

export interface ParsedRow {
  /** 1-based row number as shown in Excel. */
  readonly rowNumber: number;
  readonly name: string;
  readonly normalisedName: string;
  readonly team: string;
  readonly designation: string;
  readonly code: string | null;
  /** Aligned to ParsedMasterSheet.sprints. */
  readonly cells: readonly ScoreCell[];
  readonly sheetTotal: number | null;
  readonly sheetAverage: number | null;
}

export interface ParsedMasterSheet {
  readonly sheetName: string;
  readonly headerRow: number;
  readonly sprints: readonly SprintCode[];
  readonly emptySprints: readonly SprintCode[];
  readonly rows: readonly ParsedRow[];
}

export interface SheetInput {
  readonly name: string;
  readonly grid: RawGrid;
}

const SECTION_ROWS = new Set(['TEAM LEAD', 'SSE', 'SE', 'ASE', 'QA', 'BA', 'LEAD']);
const COMPILE_SHEET = 'compile sheet';
const text = (c: RawCell) => String(c ?? '').trim();

/** Prefer the sheet named "Compile Sheet" (trimmed, any case); else the first sheet with a valid header. */
export function chooseSheet(sheets: readonly SheetInput[]): Result<{ sheet: SheetInput; header: HeaderMap }, 'IMPORT_NO_HEADER'> {
  const ordered = [
    ...sheets.filter((s) => s.name.trim().toLowerCase() === COMPILE_SHEET),
    ...sheets.filter((s) => s.name.trim().toLowerCase() !== COMPILE_SHEET),
  ];
  for (const sheet of ordered) {
    const header = locateHeader(sheet.grid);
    if (header.ok) return ok({ sheet, header: header.value });
  }
  return err('IMPORT_NO_HEADER');
}

interface RowResult {
  readonly row: ParsedRow;
  readonly issues: ImportIssueDraft[];
}

function parseRow(raw: readonly RawCell[], index: number, h: HeaderMap): RowResult | null {
  const name = displayName(text(raw[h.name]));
  const designation = displayName(text(raw[h.designation]));
  if (!name || !designation || SECTION_ROWS.has(name.toUpperCase())) return null;
  const rowNumber = index + 1;
  const issues: ImportIssueDraft[] = [];
  const cells = h.sprints.map(({ col, code }) => {
    const parsed = parseCell(raw[col]);
    if (!parsed.ok) {
      issues.push({
        severity: 'error',
        code: parsed.code,
        row: rowNumber,
        column: code,
        employeeName: name,
        message: parsed.code === 'OUT_OF_RANGE' ? `${code}: "${parsed.raw}" is outside 0–10` : `${code}: "${parsed.raw}" is not a score, RUN or N/A`,
      });
      return NOT_SCORED;
    }
    if (parsed.rounded) {
      issues.push({ severity: 'warning', code: 'PRECISION_ROUNDED', row: rowNumber, column: code, employeeName: name, message: `${code}: ${text(raw[col])} has more than 2 decimals and was rounded`, sheetValue: Number(raw[col]) });
    }
    return parsed.cell;
  });
  const optional = (col: number | null) => (col === null ? null : parseOptionalNumber(raw[col]));
  const code = h.code === null ? '' : text(raw[h.code]);
  return {
    row: {
      rowNumber,
      name,
      normalisedName: normaliseName(name),
      team: h.team === null ? '' : displayName(text(raw[h.team])),
      designation,
      code: code || null,
      cells,
      sheetTotal: optional(h.total),
      sheetAverage: optional(h.average),
    },
    issues,
  };
}

function duplicateIssues(rows: readonly ParsedRow[]): ImportIssueDraft[] {
  const useCode = rows.some((r) => r.code);
  const seen = new Map<string, ParsedRow>();
  const issues: ImportIssueDraft[] = [];
  for (const r of rows) {
    const key = useCode && r.code ? `code:${r.code.toLowerCase()}` : `name:${r.normalisedName}`;
    const first = seen.get(key);
    if (first) {
      issues.push({ severity: 'error', code: 'DUPLICATE_NAME', row: r.rowNumber, column: null, employeeName: r.name, message: `"${r.name}" appears more than once (also row ${first.rowNumber})` });
    } else seen.set(key, r);
  }
  return issues;
}

/** Keep only sprint columns that have at least one scored cell (US-02-02 AC-5). */
function dropEmptySprints(sprints: readonly SprintCode[], rows: readonly ParsedRow[]) {
  const keep = sprints.map((_, i) => rows.some((r) => r.cells[i]?.kind === 'scored'));
  return {
    sprints: sprints.filter((_, i) => keep[i]),
    emptySprints: sprints.filter((_, i) => !keep[i]),
    rows: rows.map((r) => ({ ...r, cells: r.cells.filter((_, i) => keep[i]) })),
  };
}

/**
 * Turn raw sheets into typed rows plus row-level issues (US-02-01/02/03).
 * Ranking blocks, helper columns and other worksheets are ignored.
 */
export function interpretMasterSheet(sheets: readonly SheetInput[]): Result<{ sheet: ParsedMasterSheet; issues: ImportIssueDraft[] }, 'IMPORT_NO_HEADER'> {
  const chosen = chooseSheet(sheets);
  if (!chosen.ok) return chosen;
  const { sheet, header } = chosen.value;
  const parsed = sheet.grid
    .map((raw, i) => (i > header.row ? parseRow(raw, i, header) : null))
    .filter((r): r is RowResult => r !== null);
  const rows = parsed.map((p) => p.row);
  const trimmed = dropEmptySprints(header.sprints.map((s) => s.code), rows);
  const issues = [...parsed.flatMap((p) => p.issues), ...duplicateIssues(rows)];
  return ok({
    sheet: { sheetName: sheet.name, headerRow: header.row + 1, sprints: trimmed.sprints, emptySprints: trimmed.emptySprints, rows: trimmed.rows },
    issues,
  });
}
