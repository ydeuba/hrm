import type { ScoreCell } from './score-cell';
import type { SprintCode } from './sprint-code';

/** One engineer's cells aligned to `KpiDataset.sprints`. Isomorphic plain data. */
export interface EngineerSeries {
  readonly id: string;
  readonly name: string;
  readonly team: string;
  readonly designation: string;
  readonly active: boolean;
  readonly cells: readonly ScoreCell[];
}

export interface KpiDataset {
  readonly sprints: readonly SprintCode[];
  readonly engineers: readonly EngineerSeries[];
}
