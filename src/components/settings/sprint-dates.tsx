'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import type { SprintDto } from '@/application/use-cases/sprints/manage-sprints';

async function failure(res: Response | null): Promise<string> {
  const body = (await res?.json().catch(() => ({}))) as { error?: { message?: string } } | undefined;
  return body?.error?.message ?? 'Saving failed.';
}

const input = 'rounded-md border border-line bg-surface px-2 py-1 text-sm';

function SprintRow({ sprint }: Readonly<{ sprint: SprintDto }>) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const value = (k: string) => String(data.get(k) ?? '') || null;
    setSaving(true);
    const res = await fetch(`/api/v1/sprints/${sprint.code}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ startDate: value('startDate'), endDate: value('endDate') }),
    }).catch(() => null);
    setSaving(false);
    if (res?.ok) {
      setError(null);
      router.refresh();
      return;
    }
    setError(await failure(res));
  }

  return (
    <tr className="border-b border-line even:bg-zebra">
      <th scope="row" className="px-3 py-1.5 text-left font-semibold">{sprint.code}</th>
      <td className="px-3 py-1.5" colSpan={3}>
        <form onSubmit={save} aria-label={`Dates for ${sprint.code}`} className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor={`sd-${sprint.code}`}>Start date for {sprint.code}</label>
          <input id={`sd-${sprint.code}`} name="startDate" type="date" defaultValue={sprint.startDate ?? ''} className={input} />
          <span aria-hidden="true" className="text-muted">–</span>
          <label className="sr-only" htmlFor={`ed-${sprint.code}`}>End date for {sprint.code}</label>
          <input id={`ed-${sprint.code}`} name="endDate" type="date" defaultValue={sprint.endDate ?? ''} className={input} />
          <span className="tabular w-24 text-xs text-muted">{sprint.participants} scored</span>
          <button type="submit" disabled={saving} className="rounded-md bg-teal px-3 py-1 text-xs font-semibold text-white hover:bg-teal-strong disabled:opacity-60">Save</button>
          {error ? <span role="alert" className="text-xs text-band-ni">{error}</span> : null}
        </form>
      </td>
    </tr>
  );
}

/** Sprint calendar dates (US-03-07); empty fields clear a date. Newest first. */
export function SprintDates({ sprints }: Readonly<{ sprints: readonly SprintDto[] }>) {
  return (
    <section aria-labelledby="sprint-dates-title" className="rounded-xl border border-line bg-surface p-4">
      <h2 id="sprint-dates-title" className="text-sm font-bold text-navy">Sprint dates</h2>
      <p className="mt-1 text-sm text-muted">Optional. Dated sprints show their calendar period in chart tooltips, e.g. “S138 · 06 Oct – 17 Oct 2026”. Clear both fields to remove the dates.</p>
      {sprints.length === 0 ? (
        <p className="py-4 text-sm text-muted">Sprints appear here after the first import.</p>
      ) : (
        <div className="mt-3 max-h-96 overflow-auto">
          <table className="w-full text-[13px]">
            <tbody>{[...sprints].reverse().map((s) => <SprintRow key={s.code} sprint={s} />)}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}
