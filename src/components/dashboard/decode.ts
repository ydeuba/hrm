import type { KpiDatasetDto } from '@/application/use-cases/kpi/get-dashboard-dataset';
import type { RankedSeries } from '@/domain/kpi/dashboard';
import { NOT_SCORED, RUN, scored, type ScoreCell } from '@/domain/kpi/score-cell';

const decodeCell = (c: number | 'R' | null): ScoreCell => (c === null ? NOT_SCORED : c === 'R' ? RUN : scored(c));

/** Compact wire cells (ADR-009) → domain series. */
export function decodeDataset(ds: KpiDatasetDto): RankedSeries[] {
  return ds.engineers.map((e) => ({
    id: e.id,
    name: e.name,
    team: e.team,
    designation: e.designation,
    active: e.status === 'ACTIVE',
    overallRank: e.overallRank,
    cells: e.cells.map(decodeCell),
  }));
}
