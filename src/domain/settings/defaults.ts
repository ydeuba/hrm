import type { BandDef, KpiSettings } from './kpi-settings';

const DEFAULT_BANDS: readonly BandDef[] = Object.freeze([
  { key: 'out', label: 'Outstanding', min: 8 },
  { key: 'exc', label: 'Exceeds', min: 6 },
  { key: 'meet', label: 'Meets', min: 5 },
  { key: 'ni', label: 'Needs Improvement', min: 0 },
]);

/** Default KPI policy — the ADR-015 defaults table. */
export const DEFAULT_KPI_SETTINGS: KpiSettings = Object.freeze({
  bands: DEFAULT_BANDS,
  rankingScope: 'overall',
  rankEligibilityMinSprints: 1,
  topN: 10,
  topNMinSprints: 5,
  lastNWindow: 6,
  lastNMinSprints: 1,
  momentumMinSprints: 6,
  dataCheckTolerance: 0.02,
  totalCheckTolerance: 0.05,
  importNotScoredOverwrites: true,
  uploadRetentionDays: 90,
});

/** Seeded designations in display order (US-03-04 AC-1). */
export const DEFAULT_DESIGNATIONS: readonly string[] = Object.freeze(['Team Lead', 'SSE', 'SE', 'ASE']);
