import type { EngineerSeries } from '@/domain/kpi/dataset';
import type { SprintCode } from '@/domain/kpi/sprint-code';

export interface Revisions {
  readonly score: number;
  readonly settings: number;
}

export interface MatrixQuery {
  readonly from?: SprintCode;
  readonly to?: SprintCode;
  readonly includeInactive: boolean;
}

/** Read model for KPI views (ADR-009). */
export interface KpiReadRepository {
  revisions(): Promise<Revisions>;
  /** All sprint codes in numeric order. */
  sprintCodes(): Promise<SprintCode[]>;
  /** Engineers with cells aligned to `sprints` (sprints given in numeric order). */
  matrix(sprints: readonly SprintCode[], includeInactive: boolean): Promise<EngineerSeries[]>;
}
