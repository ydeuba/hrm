'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export interface EmployeeOption {
  readonly id: string;
  readonly name: string;
  readonly detail: string;
}

async function failure(res: Response | null, fallback: string): Promise<string> {
  const body = (await res?.json().catch(() => ({}))) as { error?: { message?: string } } | undefined;
  return body?.error?.message ?? fallback;
}

const field = 'min-h-10 rounded-md border border-line bg-surface px-2 py-1.5 text-sm';

/** Merge a duplicate into this employee (US-03-04). */
function MergePanel({ targetId, targetName, options }: Readonly<{ targetId: string; targetName: string; options: readonly EmployeeOption[] }>) {
  const router = useRouter();
  const [sourceId, setSourceId] = useState('');
  const [policy, setPolicy] = useState<'keepTarget' | 'keepSource'>('keepTarget');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const source = options.find((o) => o.id === sourceId);

  async function run() {
    setBusy(true);
    const res = await fetch(`/api/v1/employees/${targetId}/merge`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sourceId, conflictPolicy: policy }) }).catch(() => null);
    setBusy(false);
    setConfirming(false);
    if (res?.ok) {
      setSourceId('');
      setError(null);
      router.refresh();
      return;
    }
    setError(await failure(res, 'Merge failed.'));
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-navy">Merge a duplicate into {targetName}</h3>
      <p className="text-xs text-muted">Use this when a misspelt import created a second record for the same person. The duplicate is deleted, and its spelling is kept as an alias so future imports match {targetName}.</p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-xs font-semibold text-muted">
          Duplicate record
          <select value={sourceId} onChange={(e) => setSourceId(e.target.value)} className={field}>
            <option value="">Choose…</option>
            {options.map((o) => <option key={o.id} value={o.id}>{o.name} — {o.detail}</option>)}
          </select>
        </label>
        <fieldset className="flex flex-col text-xs font-semibold text-muted">
          <legend>When both have a score for the same sprint</legend>
          <div className="flex gap-3 pt-1 font-normal text-ink">
            <label className="flex items-center gap-1"><input type="radio" name="policy" checked={policy === 'keepTarget'} onChange={() => setPolicy('keepTarget')} /> Keep {targetName}&apos;s</label>
            <label className="flex items-center gap-1"><input type="radio" name="policy" checked={policy === 'keepSource'} onChange={() => setPolicy('keepSource')} /> Use the duplicate&apos;s</label>
          </div>
        </fieldset>
        <button type="button" disabled={!source} onClick={() => setConfirming(true)} className="min-h-10 rounded-md border border-line bg-surface px-4 py-2 text-sm font-semibold text-navy hover:bg-ltbg disabled:opacity-50">Merge…</button>
      </div>
      {error ? <p role="alert" className="text-xs text-band-ni">{error}</p> : null}
      <ConfirmDialog open={confirming} title="Merge employees?" confirmLabel="Merge" busy={busy} onConfirm={run} onCancel={() => setConfirming(false)}>
        <p>
          {source?.name}&apos;s scores and aliases move to {targetName}, then {source?.name} is deleted.{' '}
          {policy === 'keepTarget' ? `${targetName}'s scores win where both have one.` : `${source?.name}'s scores replace ${targetName}'s where both have one.`} Earlier imports can no longer be rolled back.
        </p>
      </ConfirmDialog>
    </div>
  );
}

/** Permanent erasure with typed-name confirmation (US-03-06, ADR-017). */
function ErasePanel({ id, name, uploads }: Readonly<{ id: string; name: string; uploads: number }>) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    const res = await fetch(`/api/v1/employees/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmName: typed }) }).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      router.push('/employees?erased=1');
      return;
    }
    setError(await failure(res, 'Erasure failed.'));
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-band-ni">Erase all of {name}&apos;s data</h3>
      <p className="text-xs text-muted">For privacy requests (Individual Privacy Act 2075). This cannot be undone.</p>
      <button type="button" onClick={() => { setOpen(true); setTyped(''); setError(null); }} className="min-h-10 rounded-md border border-band-ni px-4 py-2 text-sm font-semibold text-band-ni hover:bg-ltbg">Erase permanently…</button>
      <ConfirmDialog open={open} title={`Erase ${name}?`} confirmLabel="Erase permanently" danger busy={busy} onConfirm={run} onCancel={() => setOpen(false)}>
        <ul className="mb-3 list-disc space-y-1 pl-5">
          <li>The employee record, every score and every alias are deleted.</li>
          <li>Their name is replaced with “[erased]” in import history and the audit log.</li>
          <li>{uploads === 1 ? '1 stored master-sheet original is' : `${uploads} stored master-sheet originals are`} deleted, because they contain this person.</li>
          <li>Earlier imports can no longer be rolled back.</li>
        </ul>
        <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
          Type “{name}” to confirm
          <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" className={field} />
        </label>
        {error ? <p role="alert" className="mt-2 text-xs text-band-ni">{error}</p> : null}
      </ConfirmDialog>
    </div>
  );
}

/** Rarely used, high-impact actions at the bottom of the profile page. */
export function EmployeeDangerZone({ id, name, uploads, options }: Readonly<{ id: string; name: string; uploads: number; options: readonly EmployeeOption[] }>) {
  return (
    <section aria-labelledby="dz-title" className="space-y-5 rounded-xl border border-line bg-surface p-4 print:hidden">
      <h2 id="dz-title" className="text-sm font-bold text-navy">Data maintenance</h2>
      <MergePanel targetId={id} targetName={name} options={options} />
      <hr className="border-line" />
      <ErasePanel id={id} name={name} uploads={uploads} />
    </section>
  );
}
