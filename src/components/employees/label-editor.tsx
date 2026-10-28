'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import type { LabelRecord } from '@/application/ports/employee-write';

function buildPatch(label: LabelRecord, data: FormData): { name?: string; sortOrder?: number } {
  const name = String(data.get('name') ?? '').trim();
  const sortOrder = Number(data.get('sortOrder'));
  return { ...(name !== label.name ? { name } : {}), ...(sortOrder !== label.sortOrder ? { sortOrder } : {}) };
}

async function errorMessage(res: Response | null): Promise<string> {
  const body = (await res?.json().catch(() => ({}))) as { error?: { message?: string } } | undefined;
  return body?.error?.message ?? 'Saving failed.';
}

/** Inline rename / reorder row for a team or designation (US-03-03). */
export function LabelEditor({ kind, label }: Readonly<{ kind: 'teams' | 'designations'; label: LabelRecord }>) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const patch = buildPatch(label, new FormData(e.currentTarget));
    if (Object.keys(patch).length === 0) return;
    setSaving(true);
    const res = await fetch(`/api/v1/${kind}/${label.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) }).catch(() => null);
    setSaving(false);
    if (res?.ok) {
      setError(null);
      router.refresh();
      return;
    }
    setError(await errorMessage(res));
  }

  return (
    <tr className="border-b border-line even:bg-zebra">
      <td className="px-3 py-1.5" colSpan={4}>
        <form onSubmit={save} className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor={`ln-${label.id}`}>Name</label>
          <input id={`ln-${label.id}`} name="name" defaultValue={label.name} required maxLength={80} className="min-w-40 flex-1 rounded-md border border-line bg-surface px-2 py-1 text-sm" />
          <label className="text-xs text-muted" htmlFor={`lo-${label.id}`}>Order</label>
          <input id={`lo-${label.id}`} name="sortOrder" type="number" min={0} max={999} defaultValue={label.sortOrder} className="w-20 rounded-md border border-line bg-surface px-2 py-1 text-sm" />
          <span className="tabular w-24 text-xs text-muted">{label.headcount} people</span>
          <button type="submit" disabled={saving} className="rounded-md bg-teal px-3 py-1 text-xs font-semibold text-white hover:bg-teal-strong disabled:opacity-60">Save</button>
          {kind === 'teams' ? (
            <a href={`/print/teams/${label.id}`} target="_blank" rel="noopener" className="text-xs font-semibold text-teal underline-offset-2 hover:underline" aria-label={`Print appraisals for ${label.name}`}>
              Print appraisals
            </a>
          ) : null}
          {label.aliases.length ? <span className="text-xs text-muted">also: {label.aliases.join(', ')}</span> : null}
          {error ? <span role="alert" className="text-xs text-band-ni">{error}</span> : null}
        </form>
      </td>
    </tr>
  );
}
