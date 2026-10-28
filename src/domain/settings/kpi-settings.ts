/** KPI policy settings (ADR-015). Pure types — validated at the application edge. */
export type BandKey = 'out' | 'exc' | 'meet' | 'ni';

export interface BandDef {
  readonly key: BandKey;
  readonly label: string;
  /** Inclusive lower bound on the 2-dp average (ADR-016). */
  readonly min: number;
}

export type RankingScope = 'overall' | 'designation';

export interface KpiSettings {
  readonly bands: readonly BandDef[];
  readonly rankingScope: RankingScope;
  readonly rankEligibilityMinSprints: number;
  readonly topN: number;
  readonly topNMinSprints: number;
  readonly lastNWindow: number;
  readonly lastNMinSprints: number;
  readonly momentumMinSprints: number;
  readonly dataCheckTolerance: number;
  readonly totalCheckTolerance: number;
  readonly importNotScoredOverwrites: boolean;
  readonly uploadRetentionDays: number;
}
