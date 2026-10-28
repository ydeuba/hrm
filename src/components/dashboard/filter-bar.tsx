'use client';

import { useId, type ReactNode } from 'react';
import type { DashboardFilters } from '@/domain/kpi/dashboard';
import type { SprintCode } from '@/domain/kpi/sprint-code';
import type { BandDef } from '@/domain/settings/kpi-settings';

export interface FilterBarProps {
  readonly filters: DashboardFilters;
  readonly options: { teams: readonly string[]; designations: readonly string[] };
  readonly bands: readonly BandDef[];
  readonly allSprints: readonly SprintCode[];
  readonly range: { from: SprintCode | null; to: SprintCode | null };
  readonly onChange: (patch: Partial<Record<keyof DashboardFilters, string>>) => void;
  readonly onRange: (from: SprintCode, to: SprintCode) => void;
  readonly onReset: () => void;
  readonly isDefault: boolean;
}

const control = 'w-full min-w-36 rounded-md border border-line bg-surface px-2.5 py-2 text-sm';

function Field({ label, children, id }: { label: string; children: ReactNode; id: string }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted">{label}</label>
      {children}
    </div>
  );
}

/** Dashboard filters (US-05-02). */
export function FilterBar(p: FilterBarProps) {
  const id = useId();
  const from = p.range.from ?? p.allSprints[0];
  const to = p.range.to ?? p.allSprints.at(-1);
  return (
    <section aria-label="Filters" className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface px-4 py-3 print:hidden">
      <Field label="Designation" id={`${id}-d`}>
        <select id={`${id}-d`} className={control} value={p.filters.designation ?? ''} onChange={(e) => p.onChange({ designation: e.target.value })}>
          <option value="">All designations</option>
          {p.options.designations.map((d) => <option key={d}>{d}</option>)}
        </select>
      </Field>
      <Field label="Team" id={`${id}-t`}>
        <select id={`${id}-t`} className={control} value={p.filters.team ?? ''} onChange={(e) => p.onChange({ team: e.target.value })}>
          <option value="">All teams</option>
          {p.options.teams.map((t) => <option key={t}>{t}</option>)}
        </select>
      </Field>
      <Field label="Rating" id={`${id}-r`}>
        <select id={`${id}-r`} className={control} value={p.filters.band ?? ''} onChange={(e) => p.onChange({ band: e.target.value })}>
          <option value="">All ratings</option>
          {p.bands.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
        </select>
      </Field>
      <Field label="Sprint coverage" id={`${id}-c`}>
        <select id={`${id}-c`} className={control} value={p.filters.coverage ?? 'all'} onChange={(e) => p.onChange({ coverage: e.target.value === 'all' ? '' : e.target.value })}>
          <option value="all">All engineers</option>
          <option value="10">10+ sprints scored</option>
          <option value="6">6+ sprints scored</option>
          <option value="new">Fewer than 6 (new / partial)</option>
        </select>
      </Field>
      <Field label="From sprint" id={`${id}-f`}>
        <select id={`${id}-f`} className={control} value={from} onChange={(e) => p.onRange(e.target.value as SprintCode, to as SprintCode)}>
          {p.allSprints.map((s, i) => <option key={s} value={s} disabled={i > p.allSprints.indexOf(to as SprintCode)}>{s}</option>)}
        </select>
      </Field>
      <Field label="To sprint" id={`${id}-to`}>
        <select id={`${id}-to`} className={control} value={to} onChange={(e) => p.onRange(from as SprintCode, e.target.value as SprintCode)}>
          {p.allSprints.map((s, i) => <option key={s} value={s} disabled={i < p.allSprints.indexOf(from as SprintCode)}>{s}</option>)}
        </select>
      </Field>
      <div className="min-w-44 flex-1">
        <Field label="Search name" id={`${id}-q`}>
          <input id={`${id}-q`} type="search" className={control} placeholder="Type a name…" value={p.filters.q ?? ''} onChange={(e) => p.onChange({ q: e.target.value })} />
        </Field>
      </div>
      <button type="button" onClick={p.onReset} disabled={p.isDefault} className="min-h-10 rounded-md bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-strong disabled:opacity-50">
        Reset
      </button>
    </section>
  );
}
