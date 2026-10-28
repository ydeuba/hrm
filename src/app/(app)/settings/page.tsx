import type { Metadata } from 'next';
import { decodeDataset } from '@/components/dashboard/decode';
import { SettingsForm } from '@/components/settings/settings-form';
import { SprintDates } from '@/components/settings/sprint-dates';
import { toRows } from '@/domain/kpi/dashboard';
import { getContainer } from '@/infrastructure/container';

export const metadata: Metadata = { title: 'Settings' };

/** KPI policy settings (US-08-01…05). */
export default async function SettingsPage() {
  const { useCases } = await getContainer();
  const [settings, dataset, sprints] = await Promise.all([
    useCases.manageSettings.get(),
    useCases.getDashboardDataset.execute({ includeInactive: false }),
    useCases.manageSprints.list(),
  ]);
  const averages = dataset.ok
    ? toRows(decodeDataset(dataset.value), settings).flatMap((r) => (r.metrics.displayAverage === null ? [] : [r.metrics.displayAverage]))
    : [];
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold text-navy">Settings</h1>
        <p className="text-sm text-muted">KPI rules used by the dashboard, rankings, imports and exports. Changes apply immediately — no re-import needed.</p>
      </header>
      <SettingsForm initial={settings} averages={averages} />
      <SprintDates sprints={sprints} />
      <section aria-labelledby="backup-title" className="rounded-xl border border-line bg-surface p-4">
        <h2 id="backup-title" className="text-sm font-bold text-navy">Backup</h2>
        <p className="mt-1 text-sm text-muted">
          Downloads a zip with a consistent copy of the database and every uploaded master sheet. Keep it somewhere safe — it contains personal data. Restore steps are in the README.
        </p>
        <form method="post" action="/api/v1/backups" className="mt-3">
          <button type="submit" className="min-h-10 rounded-md border border-line bg-surface px-4 py-2 text-sm font-semibold text-navy hover:bg-ltbg">
            Download backup
          </button>
        </form>
      </section>
    </div>
  );
}
