import { err, ok, type Result } from '../shared/result';
import { MAX_SCORE, MIN_SCORE, NOT_SCORED, RUN, scored, type ScoreCell } from './score-cell';

/** What the HR Admin types into a score cell: a number, "RUN" or "N/A". */
export type CorrectionInput = number | 'RUN' | 'N/A';

export const REASON_MIN = 3;
export const REASON_MAX = 500;

/** Validate a manual correction (US-03-05 AC-1/2). */
export function parseCorrection(input: CorrectionInput, reason: string): Result<{ cell: ScoreCell; reason: string }, 'OUT_OF_RANGE' | 'REASON_LENGTH'> {
  const why = reason.trim();
  if (why.length < REASON_MIN || why.length > REASON_MAX) return err('REASON_LENGTH');
  if (input === 'RUN') return ok({ cell: RUN, reason: why });
  if (input === 'N/A') return ok({ cell: NOT_SCORED, reason: why });
  if (!Number.isFinite(input) || input < MIN_SCORE || input > MAX_SCORE) return err('OUT_OF_RANGE');
  return ok({ cell: scored(input), reason: why });
}

/** Human-readable cell for audit payloads: 8.25, "RUN" or "N/A". */
export function describeCell(cell: ScoreCell | null): number | string | null {
  if (!cell) return null;
  if (cell.kind === 'scored') return cell.centi / 100;
  return cell.kind === 'run' ? 'RUN' : 'N/A';
}
