import type { KpiSettings } from '@/domain/settings/kpi-settings';

export interface SettingsRepository {
  get(): Promise<KpiSettings>;
}

export interface SettingsWriter {
  /** Persist and bump settingsRevision (caches/ETags invalidate; rollback unaffected). */
  save(settings: KpiSettings, actorId: string): Promise<void>;
}
