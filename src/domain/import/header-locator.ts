import { parseSprintCode, type SprintCode } from '../kpi/sprint-code';
import { err, ok, type Result } from '../shared/result';
import type { RawCell } from './cell-parser';

export type RawGrid = readonly (readonly RawCell[])[];

export interface HeaderMap {
  /** 0-based index of the header row in the grid. */
  readonly row: number;
  readonly name: number;
  readonly team: number | null;
  readonly designation: number;
  readonly total: number | null;
  readonly average: number | null;
  readonly code: number | null;
  readonly sprints: readonly { readonly col: number; readonly code: SprintCode }[];
}

const text = (c: RawCell) => String(c ?? '').trim();

function findCol(row: readonly RawCell[], pattern: RegExp): number | null {
  const idx = row.findIndex((c) => pattern.test(text(c)));
  return idx < 0 ? null : idx;
}

function sprintColumns(row: readonly RawCell[]) {
  const seen = new Set<string>();
  return row.flatMap((c, col) => {
    const code = parseSprintCode(text(c));
    if (!code || seen.has(code)) return [];
    seen.add(code);
    return [{ col, code }];
  });
}

function mapRow(row: readonly RawCell[], index: number): HeaderMap | null {
  const designation = findCol(row, /^designation$/i);
  const sprints = sprintColumns(row);
  if (designation === null || sprints.length === 0) return null;
  const name = findCol(row, /^(resources?|name|employee( name)?)$/i);
  if (name === null) return null;
  return {
    row: index,
    name,
    team: findCol(row, /^teams?$/i),
    designation,
    total: findCol(row, /^total$/i),
    average: findCol(row, /^average$/i),
    code: findCol(row, /^(employee )?code$/i),
    sprints,
  };
}

/**
 * Find the header row within the first `maxScan` rows (US-02-01 AC-2): it must
 * contain "Designation", a name column ("Resources") and ≥1 `S###` column.
 * Matching is case-insensitive and whitespace-trimmed; the first occurrence of
 * each label wins, so ranking blocks to the right are ignored.
 */
export function locateHeader(grid: RawGrid, maxScan = 10): Result<HeaderMap, 'IMPORT_NO_HEADER'> {
  for (let i = 0; i < Math.min(grid.length, maxScan); i++) {
    const mapped = mapRow(grid[i] as readonly RawCell[], i);
    if (mapped) return ok(mapped);
  }
  return err('IMPORT_NO_HEADER');
}
