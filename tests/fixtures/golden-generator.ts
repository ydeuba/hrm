/**
 * Builds the golden expectations (E-00-06) from the two artefacts Management
 * already trusts. Nothing here uses src/ — expectations must be independent of
 * the implementation under test.
 *
 *  - Workbook: cached cell values of "Compile Sheet " and "Performance Insights".
 *  - Reference HTML: the RAW dataset plus its own enrich()/band() algorithm,
 *    ported verbatim below. Its `rank` field is deliberately NOT carried over
 *    (stale ranks — ADR-014).
 */
import { readFileSync } from 'node:fs';
import * as XLSX from 'xlsx';

type Cell = string | number | boolean | null;
type Grid = Cell[][];

const SPRINT_RE = /^S\d+$/;

const str = (v: Cell | undefined): string => (v === null || v === undefined ? '' : String(v).trim());
const num = (v: Cell | undefined): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
/** Numeric cell or NaN — NaN makes a missing expectation fail loudly in tests. */
const req = (v: Cell | undefined): number => num(v) ?? NaN;

function sheetGrid(wb: XLSX.WorkBook, trimmedName: string): Grid {
  const name = wb.SheetNames.find((n) => n.trim() === trimmedName);
  if (!name) throw new Error(`Sheet "${trimmedName}" not found`);
  const ws = wb.Sheets[name];
  if (!ws) throw new Error(`Sheet "${trimmedName}" unreadable`);
  return XLSX.utils.sheet_to_json<Cell[]>(ws, { header: 1, raw: true, defval: null, blankrows: true });
}

export interface WorkbookEmployee {
  name: string;
  team: string;
  designation: string;
  cells: Record<string, number | 'RUN' | 'N/A'>;
  sprintsCounted: number;
  sheetTotal: number;
  sheetAverage: number;
  overallRank: number;
  lastN: { average: number; sprints: number; rank: number };
}

export interface WorkbookExpectations {
  source: string;
  sheetName: string;
  sprints: string[];
  emptySprintColumns: string[];
  scoredCells: number;
  lastNWindow: { size: number; from: string; to: string };
  employees: WorkbookEmployee[];
  insights: {
    headline: { resources: number; overallAvg: number; latestSprint: string; latestAvg: number; latestCoverage: number; minSprintsForTop: number };
    teams: { team: string; people: number; scoreObs: number; totalScore: number; weightedAvg: number; rank: number }[];
    designations: { designation: string; people: number; scoreObs: number; weightedAvg: number }[];
    trend: { sprint: string; average: number | null; participants: number }[];
    top10: { rank: number; name: string; designation: string; team: string; sprints: number; average: number }[];
  };
}

function findCol(row: Cell[] | undefined, predicate: (s: string) => boolean): number {
  const idx = (row ?? []).findIndex((c) => predicate(str(c)));
  if (idx < 0) throw new Error('Expected header not found');
  return idx;
}

function rankingBlock(grid: Grid, nameCol: number, columns: Record<string, number>) {
  const out = new Map<string, Record<string, Cell>>();
  for (const row of grid.slice(2)) {
    const name = str(row[nameCol]);
    if (!name || num(row[nameCol - 1]) === null) continue;
    const rec: Record<string, Cell> = {};
    for (const [k, offset] of Object.entries(columns)) rec[k] = row[nameCol + offset] ?? null;
    out.set(name, rec);
  }
  return out;
}

const SECTION_ROWS = new Set(['TEAM LEAD', 'SSE', 'SE', 'ASE', 'QA', 'BA', 'LEAD']);

interface CompileColumns {
  name: number;
  team: number;
  designation: number;
  total: number;
  average: number;
  overallStart: number;
  lastNStart: number;
  sprints: (readonly [number, string])[];
}

function compileColumns(header: Cell[]): CompileColumns {
  return {
    name: findCol(header, (s) => /^resources?$/i.test(s)),
    team: findCol(header, (s) => /^teams?$/i.test(s)),
    designation: findCol(header, (s) => /^designation$/i.test(s)),
    total: findCol(header, (s) => /^total$/i.test(s)),
    average: findCol(header, (s) => /^average$/i.test(s)),
    overallStart: findCol(header, (s) => /^overall rankings?$/i.test(s)),
    lastNStart: findCol(header, (s) => /^last \d+ sprints rankings/i.test(s)),
    sprints: header.flatMap((c, i) => (SPRINT_RE.test(str(c)) ? [[i, str(c)] as const] : [])),
  };
}

function cellValue(v: Cell | undefined): number | 'RUN' | 'N/A' | undefined {
  const n = num(v);
  if (n !== null) return n;
  if (str(v).toUpperCase() === 'RUN') return 'RUN';
  return str(v) === '' ? undefined : 'N/A';
}

function parseCells(row: Cell[], cols: CompileColumns): WorkbookEmployee['cells'] {
  const cells: WorkbookEmployee['cells'] = {};
  for (const [ci, sp] of cols.sprints) {
    const v = cellValue(row[ci]);
    if (v !== undefined) cells[sp] = v;
  }
  return cells;
}

type Block = Map<string, Record<string, Cell>>;

function parseEmployee(row: Cell[], cols: CompileColumns, overall: Block, lastN: Block): WorkbookEmployee | null {
  const name = str(row[cols.name]);
  const designation = str(row[cols.designation]);
  if (!name || !designation || SECTION_ROWS.has(name.toUpperCase())) return null;
  const o = overall.get(name);
  const l = lastN.get(name);
  if (!o || !l) throw new Error(`Ranking rows missing for ${name}`);
  const cells = parseCells(row, cols);
  return {
    name,
    team: str(row[cols.team]),
    designation,
    cells,
    sprintsCounted: Object.values(cells).filter((v) => typeof v === 'number').length,
    sheetTotal: req(row[cols.total]),
    sheetAverage: req(row[cols.average]),
    overallRank: req(o.rank),
    lastN: { average: req(l.average), sprints: req(l.sprints), rank: req(l.rank) },
  };
}

export function buildWorkbookExpectations(path: string): WorkbookExpectations {
  const wb = XLSX.read(readFileSync(path), { cellFormula: false, cellHTML: false });
  const grid = sheetGrid(wb, 'Compile Sheet');
  const header = grid[0] ?? [];
  const cols = compileColumns(header);
  // Overall block: S.N | Name | Designation | Sprints | Total | Avg | Overall Ranking
  const overall = rankingBlock(grid, cols.overallStart + 1, { rank: 5 });
  // Last-N block: S.N | Name | Designation | Team | Sprints | Avg | Overall Ranking
  const lastN = rankingBlock(grid, cols.lastNStart + 1, { sprints: 3, average: 4, rank: 5 });

  const employees = grid
    .slice(1)
    .map((row) => parseEmployee(row, cols, overall, lastN))
    .filter((e): e is WorkbookEmployee => e !== null);

  const sprints = cols.sprints.map(([, sp]) => sp);
  const active = sprints.filter((sp) => employees.some((e) => typeof e.cells[sp] === 'number'));
  const lastNTitle = str(header[cols.lastNStart]);
  const windowMatch = /\((S\d+)\s*[–-]\s*(S\d+)\)/.exec(lastNTitle);
  const sizeMatch = /^last (\d+)/i.exec(lastNTitle);

  return {
    source: 'KPI Master Sheet (2).xlsx',
    sheetName: wb.SheetNames.find((n) => n.trim() === 'Compile Sheet') ?? '',
    sprints: active,
    emptySprintColumns: sprints.filter((sp) => !active.includes(sp)),
    scoredCells: employees.reduce((a, e) => a + e.sprintsCounted, 0),
    lastNWindow: { size: Number(sizeMatch?.[1]), from: windowMatch?.[1] ?? '', to: windowMatch?.[2] ?? '' },
    employees,
    insights: buildInsights(sheetGrid(wb, 'Performance Insights')),
  };
}

function buildInsights(g: Grid): WorkbookExpectations['insights'] {
  const h = g[4] ?? [];
  const rows = (from: number, to: number) => g.slice(from - 1, to);
  return {
    headline: {
      resources: num(h[0]) ?? NaN,
      overallAvg: num(h[1]) ?? NaN,
      latestSprint: str(h[2]),
      latestAvg: num(h[3]) ?? NaN,
      latestCoverage: num(h[4]) ?? NaN,
      minSprintsForTop: num(h[5]) ?? NaN,
    },
    teams: rows(10, 17)
      .filter((r) => str(r[0]))
      .map((r) => ({ team: str(r[0]), people: num(r[1]) ?? NaN, scoreObs: num(r[2]) ?? NaN, totalScore: num(r[3]) ?? NaN, weightedAvg: num(r[4]) ?? NaN, rank: num(r[5]) ?? NaN })),
    designations: rows(10, 13)
      .filter((r) => str(r[7]))
      .map((r) => ({ designation: str(r[7]), people: num(r[8]) ?? NaN, scoreObs: num(r[9]) ?? NaN, weightedAvg: num(r[10]) ?? NaN })),
    trend: rows(10, 29)
      .filter((r) => SPRINT_RE.test(str(r[12])))
      .map((r) => ({ sprint: str(r[12]), average: num(r[13]), participants: num(r[14]) ?? 0 })),
    top10: rows(21, 30)
      .filter((r) => num(r[0]) !== null)
      .map((r) => ({ rank: num(r[0]) ?? NaN, name: str(r[1]), designation: str(r[2]), team: str(r[3]), sprints: num(r[4]) ?? NaN, average: num(r[5]) ?? NaN })),
  };
}

// ───────────── Reference HTML (algorithm ported verbatim from its <script>) ─────────────

interface RawRecord {
  name: string;
  team: string;
  designation: string;
  scores: Record<string, number | null>;
  sprintsCounted: number;
  total: number;
  average: number;
  runSprints: number;
}

export interface ReferenceEngineer {
  name: string;
  team: string;
  designation: string;
  scores: Record<string, number | null>;
  runSprints: number;
  sprintsCounted: number;
  total: number;
  average: number;
  last3: number | null;
  prior3: number | null;
  momentum: number | null;
  best: number | null;
  worst: number | null;
  spread: number | null;
  band: 'out' | 'exc' | 'meet' | 'ni' | 'na';
}

const avg = (arr: number[]): number | null => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
const r2 = (x: number | null): number | null => (x === null ? null : Math.round(x * 100) / 100);

function band(a: number | null): ReferenceEngineer['band'] {
  if (a === null) return 'na';
  if (a >= 8) return 'out';
  if (a >= 6) return 'exc';
  if (a >= 5) return 'meet';
  return 'ni';
}

export function buildReferenceExpectations(htmlPath: string): { source: string; sprints: string[]; engineers: ReferenceEngineer[] } {
  const html = readFileSync(htmlPath, 'utf8');
  const m = /const RAW = (\{[\s\S]*?\});\s*\n/.exec(html);
  if (!m?.[1]) throw new Error('RAW dataset not found in reference HTML');
  const raw = JSON.parse(m[1]) as { sprints: string[]; records: RawRecord[] };
  const engineers = raw.records.map((r) => enrich(r, raw.sprints));
  return { source: 'Cloudtech_KPI_Dashboard_S122-S135.html', sprints: raw.sprints, engineers };
}

/** The reference HTML's momentum rule: last 3 vs the 3 before, only with 6+ scored sprints. */
function momentumOf(seq: number[]) {
  const last3 = seq.length ? r2(avg(seq.slice(-3))) : null;
  const prior3 = seq.length >= 4 ? r2(avg(seq.slice(-6, -3))) : null;
  const momentum = last3 !== null && prior3 !== null && seq.length >= 6 ? r2(last3 - prior3) : null;
  return { last3, prior3, momentum };
}

function spreadOf(seq: number[]): number | null {
  if (seq.length <= 1) return null;
  const mean = avg(seq) ?? 0;
  return r2(Math.sqrt(avg(seq.map((v) => (v - mean) * (v - mean))) ?? 0));
}

function enrich(r: RawRecord, sprints: string[]): ReferenceEngineer {
  const seq = sprints.map((s) => r.scores[s]).filter((v): v is number => v !== null && v !== undefined);
  const has = seq.length > 0;
  return {
    name: r.name,
    team: r.team,
    designation: r.designation,
    scores: r.scores,
    runSprints: r.runSprints,
    sprintsCounted: r.sprintsCounted,
    total: r.total,
    average: r.average,
    ...momentumOf(seq),
    best: has ? Math.max(...seq) : null,
    worst: has ? Math.min(...seq) : null,
    spread: spreadOf(seq),
    band: band(r.average),
  };
}
