import type { ReactNode } from 'react';
import type { EngineerMetrics } from '@/domain/kpi/metrics';
import type { BandDef } from '@/domain/settings/kpi-settings';
import { BandPill, DeltaText } from '@/components/dashboard/band';
import { fmt2 } from '@/components/format';

function Mini({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-lg bg-ltbg px-3 py-2">
      <div className="text-[10px] font-bold uppercase text-muted">{label}</div>
      <div className="tabular text-lg font-extrabold text-navy">{children}</div>
    </div>
  );
}

/** The eight profile figures shared by the modal, the page and the print view. */
export function ProfileStats({ m, bands }: Readonly<{ m: EngineerMetrics; bands: readonly BandDef[] }>) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Mini label="Avg">{fmt2(m.displayAverage)}</Mini>
      <Mini label="Total">{fmt2(m.total)}</Mini>
      <Mini label="Sprints">{m.sprintsCounted}</Mini>
      <Mini label="Rating"><span className="text-sm"><BandPill band={m.band} bands={bands} /></span></Mini>
      <Mini label="Last 3">{fmt2(m.last3)}</Mini>
      <Mini label="Momentum"><span className="text-base"><DeltaText value={m.momentum} /></span></Mini>
      <Mini label="Best / worst"><span className="text-base">{m.best === null ? '—' : `${fmt2(m.best)} / ${fmt2(m.worst)}`}</span></Mini>
      <Mini label="Variability"><span className="text-base">{m.spread === null ? '—' : `±${m.spread.toFixed(2)}`}</span></Mini>
    </div>
  );
}
