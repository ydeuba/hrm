import { validateBands } from '@/domain/kpi/bands';
import { DEFAULT_KPI_SETTINGS } from '@/domain/settings/defaults';
import type { KpiSettings } from '@/domain/settings/kpi-settings';
import { err, ok, type Result } from '@/domain/shared/result';
import { KpiSettingsSchema } from '@/application/contracts/settings';
import type { AuditLog } from '@/application/ports/audit-log';
import type { SettingsRepository, SettingsWriter } from '@/application/ports/settings';

export interface SettingsIssue {
  readonly path: string;
  readonly message: string;
}

/** Cross-field rules the schema can't express (US-08-01 AC-2). */
function crossFieldIssues(s: KpiSettings): SettingsIssue[] {
  const issues: SettingsIssue[] = [];
  const bands = validateBands(s.bands);
  if (!bands.ok) issues.push({ path: 'bands', message: bands.error.message });
  if (s.lastNMinSprints > s.lastNWindow) issues.push({ path: 'lastNMinSprints', message: 'Must not exceed the last-N window size' });
  return issues;
}

/** Read and change KPI policy (US-08-01…05). */
export class ManageSettings {
  constructor(private readonly deps: { readonly repo: SettingsRepository; readonly writer: SettingsWriter; readonly audit: AuditLog }) {}

  get(): Promise<KpiSettings> {
    return this.deps.repo.get();
  }

  async update(input: { settings: unknown; actorId: string }): Promise<Result<KpiSettings, readonly SettingsIssue[]>> {
    const parsed = KpiSettingsSchema.safeParse(input.settings);
    if (!parsed.success) return err(parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })));
    const next = parsed.data as KpiSettings;
    const issues = crossFieldIssues(next);
    if (issues.length) return err(issues);
    await this.persist(next, input.actorId);
    return ok(next);
  }

  async reset(actorId: string): Promise<KpiSettings> {
    await this.persist(DEFAULT_KPI_SETTINGS, actorId);
    return DEFAULT_KPI_SETTINGS;
  }

  private async persist(next: KpiSettings, actorId: string): Promise<void> {
    const before = await this.deps.repo.get();
    await this.deps.writer.save(next, actorId);
    await this.deps.audit.record({ actorId, action: 'SETTINGS_UPDATE', entity: 'AppSettings', entityId: '1', before, after: next });
  }
}
