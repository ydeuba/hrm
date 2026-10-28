import type { ScoreCell } from '@/domain/kpi/score-cell';

export type ScoreStatusDb = 'SCORED' | 'RUN' | 'NOT_SCORED';

/** Persisted shape of a cell (ADR-004): valueCenti is present iff SCORED. */
export function cellToDb(cell: ScoreCell): { status: ScoreStatusDb; valueCenti: number | null } {
  if (cell.kind === 'scored') return { status: 'SCORED', valueCenti: cell.centi };
  return { status: cell.kind === 'run' ? 'RUN' : 'NOT_SCORED', valueCenti: null };
}

export function cellFromDb(status: ScoreStatusDb, valueCenti: number | null): ScoreCell {
  if (status === 'SCORED') {
    if (valueCenti === null) throw new Error('Corrupt score: SCORED without a value');
    return { kind: 'scored', centi: valueCenti };
  }
  return status === 'RUN' ? { kind: 'run' } : { kind: 'none' };
}
