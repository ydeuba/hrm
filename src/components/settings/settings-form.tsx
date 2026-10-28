'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { bandFor } from '@/domain/kpi/bands';
import type { BandDef, KpiSettings } from '@/domain/settings/kpi-settings';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

type NumericKey = 'lastNWindow' | 'lastNMinSprints' | 'momentumMinSprints' | 'rankEligibilityMinSprints' | 'topN' | 'topNMinSprints' | 'dataCheckTolerance' | 'totalCheckTolerance' | 'uploadRetentionDays';

const PARAMS: { key: NumericKey; label: string; help: string; step?: number }[] = [
  { key: 'lastNWindow', label: 'Last-N window (sprints)', help: 'Size of the "last N sprints" ranking window. Default 6.' },
  { key: 'lastNMinSprints', label: 'Minimum sprints in last-N ranking', help: 'Engineers with fewer scored sprints in the window are listed as not eligible. Default 1.' },
  { key: 'momentumMinSprints', label: 'Minimum sprints for momentum', help: 'Momentum (last 3 vs prior 3) needs at least this many scored sprints. Default 6.' },
  { key: 'rankEligibilityMinSprints', label: 'Minimum sprints for overall rank', help: 'Below this, engineers appear as "not yet eligible". Default 1 (matches the master sheet).' },
  { key: 'topN', label: 'Top-N size', help: 'How many performers the Top-N list shows. Default 10.' },
  { key: 'topNMinSprints', label: 'Minimum sprints for Top-N', help: 'Default 5 (matches Performance Insights).' },
  { key: 'dataCheckTolerance', label: 'Average mismatch tolerance', help: 'Sheet averages differing by more than this are flagged on import. Default 0.02.', step: 0.01 },
  { key: 'totalCheckTolerance', label: 'Total mismatch tolerance', help: 'Default 0.05.', step: 0.01 },
  { key: 'uploadRetentionDays', label: 'Keep uploaded originals (days)', help: 'Originals older than this are purged on the next upload. Default 90.' },
];

const field = 'w-full rounded-md border border-line bg-surface px-3 py-2 text-sm';
const label = 'mb-1 block text-xs font-bold uppercase tracking-wide text-muted';

type Issue = { path: string; message: string };
type ApiError = { error?: { message?: string; details?: Issue[] } };

function failure(b: ApiError | undefined): { ok: false; issues: Issue[]; message: string } {
  const e = b?.error;
  return { ok: false, issues: e?.details ?? [], message: e?.message ?? 'Saving failed.' };
}

async function request(url: string, method: 'PUT' | 'POST', body?: unknown): Promise<{ ok: true } | { ok: false; issues: Issue[]; message: string }> {
  const init: RequestInit = { method, headers: { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) };
  const res = await fetch(url, init).catch(() => null);
  if (res?.ok) return { ok: true };
  return failure((await res?.json().catch(() => undefined)) as ApiError | undefined);
}

function bandChanges(averages: readonly number[], from: readonly BandDef[], to: readonly BandDef[]): number {
  return averages.filter((a) => bandFor(a, from) !== bandFor(a, to)).length;
}

/** KPI policy editor (US-08-01…05). */
export function SettingsForm({ initial, averages }: Readonly<{ initial: KpiSettings; averages: readonly number[] }>) {
  const router = useRouter();
  const [s, setS] = useState<KpiSettings>(initial);
  const [status, setStatus] = useState<{ kind: 'idle' | 'saved' } | { kind: 'error'; message: string; issues: { path: string; message: string }[] }>({ kind: 'idle' });
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const changed = useMemo(() => bandChanges(averages, initial.bands, s.bands), [averages, initial.bands, s.bands]);
  const issueFor = (path: string) => (status.kind === 'error' ? status.issues.find((i) => i.path === path || i.path.startsWith(`${path}.`))?.message : undefined);

  const setBand = (i: number, patch: Partial<BandDef>) => setS((cur) => ({ ...cur, bands: cur.bands.map((b, j) => (j === i ? { ...b, ...patch } : b)) }));

  async function save(kind: 'save' | 'reset') {
    setBusy(true);
    const res = kind === 'save' ? await request('/api/v1/settings', 'PUT', s) : await request('/api/v1/settings/reset', 'POST');
    setBusy(false);
    setConfirmReset(false);
    if (res.ok) {
      setStatus({ kind: 'saved' });
      router.refresh();
    } else setStatus({ kind: 'error', message: res.message, issues: res.issues });
  }

  return (
    <div className="space-y-4">
      <section aria-labelledby="bands-title" className="rounded-xl border border-line bg-surface p-4">
        <h2 id="bands-title" className="mb-1 text-sm font-bold text-navy">Rating bands</h2>
        <p className="mb-3 text-xs text-muted">Bands apply to the 2-decimal average, inclusive at the lower bound. Minimums must strictly descend.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {s.bands.map((b, i) => (
            <div key={b.key} className="grid grid-cols-[1fr_7rem] gap-2">
              <div>
                <label htmlFor={`bl-${b.key}`} className={label}>Label</label>
                <input id={`bl-${b.key}`} value={b.label} maxLength={40} onChange={(e) => setBand(i, { label: e.target.value })} className={field} />
              </div>
              <div>
                <label htmlFor={`bm-${b.key}`} className={label}>{b.key === 'ni' ? 'Below' : 'Minimum'}</label>
                <input id={`bm-${b.key}`} type="number" step={0.01} min={0} max={10} value={b.min} disabled={b.key === 'ni'} onChange={(e) => setBand(i, { min: Number(e.target.value) })} className={field} />
              </div>
            </div>
          ))}
        </div>
        {issueFor('bands') ? <p role="alert" className="mt-2 text-xs text-band-ni">{issueFor('bands')}</p> : null}
        <p className="mt-3 text-xs text-navy" role="status">{changed === 0 ? 'No engineer changes band with these thresholds.' : `${changed} engineer${changed === 1 ? '' : 's'} would change band.`}</p>
      </section>

      <section aria-labelledby="params-title" className="rounded-xl border border-line bg-surface p-4">
        <h2 id="params-title" className="mb-3 text-sm font-bold text-navy">Calculation parameters</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PARAMS.map((p) => (
            <div key={p.key}>
              <label htmlFor={`p-${p.key}`} className={label}>{p.label}</label>
              <input id={`p-${p.key}`} type="number" step={p.step ?? 1} min={0} value={s[p.key]} aria-describedby={`ph-${p.key}`} aria-invalid={issueFor(p.key) ? true : undefined}
                onChange={(e) => setS((cur) => ({ ...cur, [p.key]: Number(e.target.value) }))} className={field} />
              <p id={`ph-${p.key}`} className="mt-1 text-xs text-muted">{issueFor(p.key) ?? p.help}</p>
            </div>
          ))}
          <div>
            <label htmlFor="p-scope" className={label}>Ranking scope on printouts</label>
            <select id="p-scope" value={s.rankingScope} onChange={(e) => setS((cur) => ({ ...cur, rankingScope: e.target.value as KpiSettings['rankingScope'] }))} className={field}>
              <option value="overall">Overall (org-wide)</option>
              <option value="designation">Within designation</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="inline-flex items-start gap-2 text-sm">
              <input type="checkbox" checked={s.importNotScoredOverwrites} onChange={(e) => setS((cur) => ({ ...cur, importNotScoredOverwrites: e.target.checked }))} className="mt-1" />
              <span>An N/A in a newly imported sheet clears a previously stored score (the file is the source of truth).</span>
            </label>
          </div>
        </div>
      </section>

      {status.kind === 'error' ? <Alert tone="error" title="Settings not saved">{status.message}</Alert> : null}
      {status.kind === 'saved' ? <Alert tone="success">Settings saved — the dashboard is recalculated with the new rules.</Alert> : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={() => setConfirmReset(true)} disabled={busy}>Reset to defaults</Button>
        <Button onClick={() => void save('save')} loading={busy}>Save settings</Button>
      </div>
      <ConfirmDialog open={confirmReset} title="Reset settings to defaults?" confirmLabel="Reset" busy={busy} onConfirm={() => void save('reset')} onCancel={() => setConfirmReset(false)}>
        Bands, windows, thresholds and the import policy return to their original defaults. The change is recorded in the audit log.
      </ConfirmDialog>
    </div>
  );
}
