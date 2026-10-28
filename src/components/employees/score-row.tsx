'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

export interface ScoreRowData {
  readonly sprint: string;
  readonly cell: number | 'R' | null;
  readonly stored: boolean;
  readonly orgAverage: number | null;
  readonly source: { readonly batchId: string; readonly fileName: string } | null;
}

const cellText = (c: number | 'R' | null, stored: boolean) => (c === 'R' ? 'RUN' : c === null ? (stored ? 'N/A' : '—') : c.toFixed(2));
const initialValue = (c: number | 'R' | null, stored: boolean) => (c === 'R' ? 'RUN' : c === null ? (stored ? 'N/A' : '') : c.toFixed(2));

/** "8.5", "RUN" or "N/A" → request value; anything else stays a string so the server rejects it. */
function toValue(raw: string): number | 'RUN' | 'N/A' | string {
  const v = raw.trim().toUpperCase();
  if (v === 'RUN' || v === 'N/A') return v;
  const n = Number(v);
  return v !== '' && Number.isFinite(n) ? n : raw;
}

async function failure(res: Response | null): Promise<string> {
  const body = (await res?.json().catch(() => ({}))) as { error?: { message?: string } } | undefined;
  return body?.error?.message ?? 'Saving failed.';
}

/** One sprint row of the profile score table with an inline correction form (US-03-05). */
export function ScoreRow({ employeeId, row }: Readonly<{ employeeId: string; row: ScoreRowData }>) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const value = toValue(String(data.get('value') ?? ''));
    if (typeof value === 'string' && value !== 'RUN' && value !== 'N/A') {
      setError('Enter a score from 0 to 10, RUN or N/A.');
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/v1/employees/${employeeId}/scores/${row.sprint}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value, reason: String(data.get('reason') ?? '') }),
    }).catch(() => null);
    setSaving(false);
    if (res?.ok) {
      setEditing(false);
      setError(null);
      router.refresh();
      return;
    }
    setError(await failure(res));
  }

  return (
    <tr className="border-b border-line align-top even:bg-zebra">
      <td className="px-3 py-1.5">{row.sprint}</td>
      <td className="tabular px-3 py-1.5 text-right font-semibold">{cellText(row.cell, row.stored)}</td>
      <td className="tabular px-3 py-1.5 text-right text-muted">{row.orgAverage === null ? '—' : row.orgAverage.toFixed(2)}</td>
      <td className="px-3 py-1.5">
        {row.source ? <Link href={`/imports/${row.source.batchId}`} className="text-teal underline-offset-2 hover:underline">{row.source.fileName}</Link> : <span className="text-muted">{row.stored ? 'Manual correction' : '—'}</span>}
      </td>
      <td className="px-3 py-1.5 text-right print:hidden">
        {editing ? (
          <form onSubmit={save} aria-label={`Correct ${row.sprint}`} className="flex flex-wrap items-start justify-end gap-2">
            <label className="sr-only" htmlFor={`v-${row.sprint}`}>New value for {row.sprint}</label>
            <input id={`v-${row.sprint}`} name="value" defaultValue={initialValue(row.cell, row.stored)} placeholder="0–10, RUN, N/A" required className="w-28 rounded-md border border-line bg-surface px-2 py-1 text-sm" />
            <label className="sr-only" htmlFor={`r-${row.sprint}`}>Reason</label>
            <input id={`r-${row.sprint}`} name="reason" placeholder="Reason (required)" required minLength={3} maxLength={500} className="w-56 rounded-md border border-line bg-surface px-2 py-1 text-sm" />
            <button type="submit" disabled={saving} className="rounded-md bg-teal px-3 py-1 text-xs font-semibold text-white hover:bg-teal-strong disabled:opacity-60">Save</button>
            <button type="button" onClick={() => { setEditing(false); setError(null); }} className="rounded-md px-2 py-1 text-xs text-muted hover:text-navy">Cancel</button>
            {error ? <p role="alert" className="basis-full text-right text-xs text-band-ni">{error}</p> : null}
          </form>
        ) : (
          <button type="button" onClick={() => setEditing(true)} aria-label={`Edit ${row.sprint} score`} className="rounded px-2 py-1 text-xs font-semibold text-teal hover:bg-ltbg">Edit</button>
        )}
      </td>
    </tr>
  );
}
