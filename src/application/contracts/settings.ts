import { z } from 'zod';
import { DEFAULT_KPI_SETTINGS } from '@/domain/settings/defaults';
import type { KpiSettings } from '@/domain/settings/kpi-settings';

const Band = z.object({
  key: z.enum(['out', 'exc', 'meet', 'ni']),
  label: z.string().trim().min(1).max(40),
  min: z.number().min(0).max(10),
});

const count = (min: number, max: number) => z.number().int().min(min).max(max);

/** Validated KPI settings (ADR-015). Band ordering rules are checked by the domain (validateBands). */
export const KpiSettingsSchema = z.object({
  bands: z.array(Band).length(4),
  rankingScope: z.enum(['overall', 'designation']),
  rankEligibilityMinSprints: count(1, 200),
  topN: count(1, 100),
  topNMinSprints: count(1, 200),
  lastNWindow: count(1, 20),
  lastNMinSprints: count(1, 20),
  momentumMinSprints: count(4, 50),
  dataCheckTolerance: z.number().min(0).max(1),
  totalCheckTolerance: z.number().min(0).max(5),
  importNotScoredOverwrites: z.boolean(),
  uploadRetentionDays: count(1, 3650),
});

/** Stored settings merged over defaults; anything invalid falls back to the default for that key. */
export function settingsFromStored(stored: unknown): KpiSettings {
  const base = { ...DEFAULT_KPI_SETTINGS } as Record<string, unknown>;
  const raw = stored && typeof stored === 'object' ? (stored as Record<string, unknown>) : {};
  for (const [key, value] of Object.entries(raw)) {
    const field = KpiSettingsSchema.shape[key as keyof typeof KpiSettingsSchema.shape];
    if (field?.safeParse(value).success) base[key] = value;
  }
  return base as unknown as KpiSettings;
}
