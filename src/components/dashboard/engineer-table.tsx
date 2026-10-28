'use client';

import { useMemo, useState } from 'react';
import type { EngineerRow } from '@/domain/kpi/dashboard';
import type { BandDef } from '@/domain/settings/kpi-settings';
import { fmt2 } from '@/components/format';
import { BandPill, DeltaText } from './band';

type SortKey = 'rank' | 'name' | 'team' | 'designation' | 'sprints' | 'total' | 'average' | 'last3' | 'momentum' | 'rating';

const COLUMNS: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: 'rank', label: 'Rank', numeric: true },
  { key: 'name', label: 'Name', numeric: false },
  { key: 'team', label: 'Team', numeric: false },
  { key: 'designation', label: 'Designation', numeric: false },
  { key: 'sprints', label: 'Sprints', numeric: true },
  { key: 'total', label: 'Total', numeric: true },
  { key: 'average', label: 'Avg score', numeric: true },
  { key: 'last3', label: 'Last 3', numeric: true },
  { key: 'momentum', label: 'Momentum', numeric: true },
  { key: 'rating', label: 'Rating', numeric: false },
];

/** Columns whose natural first sort is ascending (text, and rank where 1 is best). */
const ASCENDING_FIRST = new Set<SortKey>(['rank', 'name', 'team', 'designation']);

function value(r: EngineerRow, key: SortKey): string | number | null {
  const m = r.metrics;
  const map: Record<SortKey, string | number | null> = {
    rank: r.overallRank, name: r.name, team: r.team, designation: r.designation, sprints: m.sprintsCounted,
    total: m.total, average: m.average, last3: m.last3, momentum: m.momentum, rating: m.average,
  };
  return map[key];
}

/** Nulls always sort last regardless of direction (US-05-05 AC-2). */
function compare(a: EngineerRow, b: EngineerRow, key: SortKey, dir: 1 | -1): number {
  const va = value(a, key);
  const vb = value(b, key);
  if (va === null || vb === null) return va === vb ? 0 : va === null ? 1 : -1;
  const base = typeof va === 'string' ? va.localeCompare(String(vb)) : va - (vb as number);
  return base * dir || a.name.localeCompare(b.name);
}

/** 3-dp tooltip when adjacent rows display the same 2-dp average but rank differently (ADR-016). */
function needsPrecision(rows: readonly EngineerRow[], i: number): boolean {
  const r = rows[i];
  const show = (x?: EngineerRow) => x && x.metrics.displayAverage === r?.metrics.displayAverage && x.overallRank !== r?.overallRank;
  return Boolean(r?.metrics.average !== null && (show(rows[i - 1]) || show(rows[i + 1])));
}

export function EngineerTable({ rows, bands, onOpen }: Readonly<{ rows: readonly EngineerRow[]; bands: readonly BandDef[]; onOpen: (id: string) => void }>) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'rank', dir: 1 });
  const sorted = useMemo(() => [...rows].sort((a, b) => compare(a, b, sort.key, sort.dir)), [rows, sort]);
  const toggle = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: ASCENDING_FIRST.has(key) ? 1 : -1 }));

  return (
    <section aria-labelledby="eng-title" className="rounded-xl border border-line bg-surface p-4">
      <h2 id="eng-title" className="mb-3 text-sm font-bold text-navy">
        Engineers <span className="font-normal text-muted">({sorted.length} shown)</span>
      </h2>
      {sorted.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">No engineers match these filters.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="bg-navy text-[11px] uppercase tracking-wide text-white">
                {COLUMNS.map((c) => (
                  <th key={c.key} scope="col" aria-sort={sort.key === c.key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'} className={`whitespace-nowrap px-2.5 py-2 ${c.numeric ? 'text-right' : ''}`}>
                    <button type="button" onClick={() => toggle(c.key)} className="inline-flex items-center gap-1 font-bold uppercase">
                      {c.label}
                      <span aria-hidden="true" className="text-[9px] opacity-70">{sort.key === c.key ? (sort.dir === 1 ? '▲' : '▼') : '▲▼'}</span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr
                  key={r.id}
                  tabIndex={0}
                  onClick={() => onOpen(r.id)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    // Prevent the same keystroke from activating the dialog's close button once focus moves into it.
                    e.preventDefault();
                    onOpen(r.id);
                  }}
                  aria-label={`${r.name}: open profile`}
                  className="cursor-pointer border-b border-line even:bg-zebra hover:bg-ltbg focus-visible:bg-ltbg"
                >
                  <td className="tabular px-2.5 py-2 text-right font-extrabold text-navy">{r.overallRank ?? '—'}</td>
                  <td className="px-2.5 py-2">{r.name}</td>
                  <td className="px-2.5 py-2">{r.team}</td>
                  <td className="px-2.5 py-2">{r.designation}</td>
                  <td className="tabular px-2.5 py-2 text-right">{r.metrics.sprintsCounted}</td>
                  <td className="tabular px-2.5 py-2 text-right">{fmt2(r.metrics.total)}</td>
                  <td className="tabular px-2.5 py-2 text-right font-bold" title={needsPrecision(sorted, i) ? `Exact average ${r.metrics.average?.toFixed(3)}` : undefined}>
                    {fmt2(r.metrics.displayAverage)}
                  </td>
                  <td className="tabular px-2.5 py-2 text-right">{fmt2(r.metrics.last3)}</td>
                  <td className="tabular px-2.5 py-2 text-right"><DeltaText value={r.metrics.momentum} /></td>
                  <td className="px-2.5 py-2"><BandPill band={r.metrics.band} bands={bands} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-[11px] text-muted">
        Rank is the overall competition rank on the exact average. RUN and N/A sprints are excluded from every calculation. Select a row for the sprint-by-sprint profile.
      </p>
    </section>
  );
}
