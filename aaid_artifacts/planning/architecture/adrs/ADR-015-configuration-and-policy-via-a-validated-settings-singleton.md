# ADR-015: Configuration and policy via a validated settings singleton

_Source of truth: [architecture.md](../architecture.md) — extracted 2026-10-15._

- **Status**: Accepted
- **Context**: Rating bands, the last-N window, eligibility thresholds and the import overwrite policy are business policy, and several are still open (OQ-04…07).
- **Decision**: An `AppSettings` singleton row (`id = 1`) with a JSON column validated by the Zod `KpiSettingsSchema` and default values in `src/domain/settings/defaults.ts`. Settings changes increment `settingsRevision` (not `scoreRevision`), so caches and ETags become invalid without blocking import rollback. Open questions become settings, with these defaults:

  | Setting | Default | Rationale / source |
  |---|---|---|
  | `bands` | Outstanding ≥ 8.00 · Exceeds ≥ 6.00 · Meets ≥ 5.00 · Needs Improvement < 5.00 | US-04-02; compared on the 2-dp average (ADR-016) |
  | `rankingScope` | `overall` | The dashboard Rank column always shows the overall rank; the designation rank is on the profile and the Rankings tab (OQ-04) |
  | `rankEligibilityMinSprints` | 1 | Matches the current sheet (OQ-05 may raise it) |
  | `topN` / `topNMinSprints` | 10 / 5 | Performance Insights F5 |
  | `lastNWindow` / `lastNMinSprints` | 6 / 1 | Sheet1 G1; the sheet ranks everyone in the window |
  | `momentumMinSprints` | 6 | US-04-01 AC-3 |
  | `dataCheckTolerance` / `totalCheckTolerance` | 0.02 / 0.05 | US-02-04 |
  | `importNotScoredOverwrites` | `true` | The file is the source of truth; N/A in a new file clears an old score (OQ-07) |
  | `uploadRetentionDays` | 90 | ADR-017 (OQ-11) |
- **Consequences**: Answering the open questions needs no code change. Every setting needs validation and tests, which keeps the settings list deliberately small.
