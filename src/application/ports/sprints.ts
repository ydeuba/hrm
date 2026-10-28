import type { SprintCode } from '@/domain/kpi/sprint-code';
import { sprintPeriodLabel } from '@/domain/kpi/sprint-period';

export interface SprintPeriod {
  readonly code: SprintCode;
  readonly startDate: Date | null;
  readonly endDate: Date | null;
}

export interface SprintRecord extends SprintPeriod {
  /** Engineers with a stored score (any status) for the sprint. */
  readonly participants: number;
}

/** Tooltip labels for dated sprints only, keyed by code (US-03-07 AC-2). */
export function periodLabels(sprints: readonly SprintPeriod[]): Record<string, string> {
  return Object.fromEntries(sprints.filter((s) => s.startDate || s.endDate).map((s) => [s.code, sprintPeriodLabel(s.code, s.startDate, s.endDate)]));
}

export interface SprintRepository {
  /** Every sprint in numeric order. */
  list(): Promise<SprintRecord[]>;
  /** Dated sprints only, without counts — cheap enough for every dataset build. */
  periods(): Promise<SprintPeriod[]>;
  /** Set or clear the dates; bumps settingsRevision so cached datasets refresh. null = unknown sprint. */
  setDates(code: SprintCode, startDate: Date | null, endDate: Date | null): Promise<{ before: SprintRecord; after: SprintRecord } | null>;
}
