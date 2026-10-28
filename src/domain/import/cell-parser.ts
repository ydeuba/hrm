import { hasExtraPrecision, MAX_SCORE, MIN_SCORE, NOT_SCORED, RUN, scored, type ScoreCell } from '../kpi/score-cell';

export type RawCell = string | number | boolean | null | undefined;

export type ParsedCell =
  | { readonly ok: true; readonly cell: ScoreCell; readonly rounded: boolean }
  | { readonly ok: false; readonly code: 'OUT_OF_RANGE' | 'NON_NUMERIC'; readonly raw: string };

/** Markers that mean "not scored" (US-02-02 AC-2), compared upper-cased and trimmed. */
const NOT_SCORED_MARKERS = new Set(['', 'N/A', 'NA', '-', '—']);
const NUMERIC_TEXT = /^[+-]?(\d+(\.\d*)?|\.\d+)$/;

function parseNumber(value: number, raw: string): ParsedCell {
  if (!Number.isFinite(value) || value < MIN_SCORE || value > MAX_SCORE) return { ok: false, code: 'OUT_OF_RANGE', raw };
  return { ok: true, cell: scored(value), rounded: hasExtraPrecision(value) };
}

/**
 * Interpret one sprint cell: number 0–10 → scored (half-up to 2 dp, flagged
 * when rounded); RUN → run; N/A, NA, -, blank, Excel errors (#DIV/0! …) →
 * not scored; anything else → a row-level error.
 */
export function parseCell(value: RawCell): ParsedCell {
  if (typeof value === 'number') return parseNumber(value, String(value));
  if (value === null || value === undefined) return { ok: true, cell: NOT_SCORED, rounded: false };
  const text = String(value).trim();
  const upper = text.toUpperCase();
  if (upper === 'RUN') return { ok: true, cell: RUN, rounded: false };
  if (NOT_SCORED_MARKERS.has(upper) || text.startsWith('#')) return { ok: true, cell: NOT_SCORED, rounded: false };
  if (NUMERIC_TEXT.test(text)) return parseNumber(Number(text), text);
  return { ok: false, code: 'NON_NUMERIC', raw: text };
}

/** Optional numeric cell (sheet Total / Average): number, numeric text, or null. */
export function parseOptionalNumber(value: RawCell): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const text = String(value ?? '').trim();
  return NUMERIC_TEXT.test(text) ? Number(text) : null;
}
