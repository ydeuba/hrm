'use client';

import { useId, useState, type ReactNode } from 'react';

export interface ChartTable {
  readonly headers: readonly string[];
  readonly rows: readonly (readonly (string | number)[])[];
}

/**
 * Chart container (design.md ChartPanel): canvas with an accessible summary and
 * a "Show as table" toggle rendering the same data as a real table (NFR-24).
 */
export function ChartPanel({
  title,
  summary,
  table,
  height = 240,
  note,
  empty,
  children,
}: Readonly<{ title: ReactNode; summary: string; table: ChartTable; height?: number; note?: string; empty?: string; children: ReactNode }>) {
  const id = useId();
  const [asTable, setAsTable] = useState(false);
  const isEmpty = table.rows.length === 0;
  return (
    <section aria-labelledby={`${id}-t`} className="rounded-xl border border-line bg-surface p-4 break-inside-avoid">
      <div className="mb-3 flex items-start justify-between gap-2">
        <h2 id={`${id}-t`} className="text-sm font-bold text-navy">{title}</h2>
        {isEmpty ? null : (
          <button type="button" onClick={() => setAsTable((v) => !v)} aria-pressed={asTable} className="rounded px-2 py-1 text-xs font-semibold text-teal hover:bg-ltbg print:hidden">
            {asTable ? 'Show chart' : 'Show as table'}
          </button>
        )}
      </div>
      <p id={`${id}-s`} className="sr-only">{summary}</p>
      {isEmpty ? (
        <p className="flex items-center justify-center text-center text-sm text-muted" style={{ height }}>{empty ?? 'No engineers match these filters.'}</p>
      ) : asTable ? (
        <div className="overflow-auto" style={{ maxHeight: height + 60 }}>
          <table className="w-full text-left text-[13px]">
            <thead><tr className="bg-navy text-[11px] uppercase text-white">{table.headers.map((h) => <th key={h} scope="col" className="px-2 py-1.5">{h}</th>)}</tr></thead>
            <tbody>
              {table.rows.map((r) => (
                <tr key={String(r[0])} className="border-b border-line even:bg-zebra">{r.map((c, i) => <td key={i} className={`px-2 py-1 ${typeof c === 'number' ? 'tabular text-right' : ''}`}>{c}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div role="img" aria-labelledby={`${id}-t`} aria-describedby={`${id}-s`} className="relative" style={{ height }}>
          {children}
        </div>
      )}
      {note ? <p className="mt-2 text-[11px] text-muted">{note}</p> : null}
    </section>
  );
}
