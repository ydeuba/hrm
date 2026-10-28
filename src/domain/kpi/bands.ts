import type { BandDef, BandKey } from '../settings/kpi-settings';
import { ValidationError } from '../shared/errors';
import { err, ok, type Result } from '../shared/result';

export type BandOrNone = BandKey | 'na';

/**
 * Map a 2-dp average (the value users see, ADR-016) to a band. Bands are
 * inclusive at their lower bound and checked from the highest minimum down.
 */
export function bandFor(displayAverage: number | null, bands: readonly BandDef[]): BandOrNone {
  if (displayAverage === null) return 'na';
  const sorted = [...bands].sort((a, b) => b.min - a.min);
  return sorted.find((b) => displayAverage >= b.min)?.key ?? 'na';
}

/** Bands must be the four keys, strictly descending, within 0–10 (US-08-01 AC-2). */
export function validateBands(bands: readonly BandDef[]): Result<void, ValidationError> {
  const keys = bands.map((b) => b.key).join(',');
  if (keys !== 'out,exc,meet,ni') {
    return err(new ValidationError('Bands must be Outstanding, Exceeds, Meets, Needs Improvement in that order'));
  }
  const outOfRange = bands.find((b) => !Number.isFinite(b.min) || b.min < 0 || b.min > 10);
  if (outOfRange) return err(new ValidationError(`Band "${outOfRange.label}" minimum must be between 0 and 10`));
  const mins = bands.map((b) => b.min);
  const notDescending = mins.slice(1).some((min, i) => min >= (mins[i] as number));
  if (notDescending) return err(new ValidationError('Band minimums must strictly descend'));
  if (bands.some((b) => !b.label.trim())) return err(new ValidationError('Every band needs a label'));
  return ok(undefined);
}
