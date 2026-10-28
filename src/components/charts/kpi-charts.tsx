'use client';

import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartOptions,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import type { Mover } from '@/domain/kpi/dashboard';
import type { GroupSummary, SprintPoint } from '@/domain/kpi/groups';
import type { BandDef, BandKey } from '@/domain/settings/kpi-settings';
import { fmt2, formatPercent } from '@/components/format';
import { ChartPanel } from './chart-panel';
import { periodTitle } from './period-title';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, LineElement, PointElement, Filler, Tooltip, Legend);

/** Chart-only hues (≥3:1 on white); text uses the AA-safe band tokens instead. */
const C = { navy: '#10233f', teal: '#0f6e78', teal2: '#13909c', out: '#1e8e4e', exc: '#0f6e78', meet: '#c8881a', ni: '#c0392b', grid: 'rgba(16,35,63,.08)' };
const BAND_COLOR: Record<BandKey, string> = { out: C.out, exc: C.exc, meet: C.meet, ni: C.ni };

const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const base = <T extends 'bar' | 'line' | 'doughnut'>(extra: ChartOptions<T>): ChartOptions<T> =>
  ({ maintainAspectRatio: false, animation: reduceMotion() ? false : { duration: 250 }, ...extra }) as ChartOptions<T>;

const groupRows = (gs: readonly GroupSummary[]) => gs.map((g) => [g.key, g.people, g.scoreObs, fmt2(g.weightedAverage)] as const);

export function DesignationChart({ groups }: Readonly<{ groups: readonly GroupSummary[] }>) {
  const labels = groups.map((g) => g.key);
  return (
    <ChartPanel
      title="Average score by designation"
      summary={`Weighted average by designation: ${groups.map((g) => `${g.key} ${fmt2(g.weightedAverage)}`).join(', ')}.`}
      table={{ headers: ['Designation', 'People', 'Scores', 'Weighted avg'], rows: groupRows(groups) }}
    >
      <Bar
        aria-hidden="true"
        data={{ labels, datasets: [{ data: groups.map((g) => g.weightedAverage ?? 0), backgroundColor: C.teal, borderRadius: 5 }] }}
        options={base<'bar'>({
          plugins: { legend: { display: false }, tooltip: { callbacks: { afterLabel: (c) => `${groups[c.dataIndex]?.people ?? 0} engineer(s)` } } },
          scales: { y: { beginAtZero: true, max: 10, grid: { color: C.grid } }, x: { grid: { display: false } } },
        })}
      />
    </ChartPanel>
  );
}

export function TeamChart({ groups }: Readonly<{ groups: readonly GroupSummary[] }>) {
  return (
    <ChartPanel
      title="Average score by team"
      height={300}
      summary={`Weighted average by team, highest first: ${groups.map((g) => `${g.key} ${fmt2(g.weightedAverage)}`).join(', ')}.`}
      table={{ headers: ['Team', 'People', 'Scores', 'Weighted avg'], rows: groupRows(groups) }}
    >
      <Bar
        aria-hidden="true"
        data={{ labels: groups.map((g) => g.key), datasets: [{ data: groups.map((g) => g.weightedAverage ?? 0), backgroundColor: C.teal2, borderRadius: 4 }] }}
        options={base<'bar'>({
          indexAxis: 'y',
          plugins: { legend: { display: false }, tooltip: { callbacks: { afterLabel: (c) => `${groups[c.dataIndex]?.people ?? 0} engineer(s)` } } },
          scales: { x: { beginAtZero: true, max: 10, grid: { color: C.grid } }, y: { grid: { display: false } } },
        })}
      />
    </ChartPanel>
  );
}

export function DistributionChart({ counts, bands }: Readonly<{ counts: Readonly<Record<BandKey, number>>; bands: readonly BandDef[] }>) {
  const total = bands.reduce((a, b) => a + counts[b.key], 0);
  return (
    <ChartPanel
      title="Rating distribution"
      summary={`Engineers per rating: ${bands.map((b) => `${b.label} ${counts[b.key]}`).join(', ')}.`}
      table={{ headers: ['Rating', 'Engineers'], rows: total ? bands.map((b) => [b.label, counts[b.key]] as const) : [] }}
    >
      <Doughnut
        aria-hidden="true"
        data={{ labels: bands.map((b) => `${b.label} (${counts[b.key]})`), datasets: [{ data: bands.map((b) => counts[b.key]), backgroundColor: bands.map((b) => BAND_COLOR[b.key]) }] }}
        options={base<'doughnut'>({ plugins: { legend: { position: 'right', labels: { boxWidth: 12 } } } })}
      />
    </ChartPanel>
  );
}

export function TrendChart({ trend, periods = {} }: Readonly<{ trend: readonly SprintPoint[]; periods?: Readonly<Record<string, string>> }>) {
  const withData = trend.filter((p) => p.participants > 0);
  return (
    <ChartPanel
      title="Org average score per sprint"
      height={300}
      note="Average of the engineers in view who had a score that sprint. Gaps are sprints with no scores."
      summary={`Org average per sprint from ${trend[0]?.sprint ?? ''} to ${trend.at(-1)?.sprint ?? ''}; latest ${fmt2(withData.at(-1)?.average)}.`}
      table={{ headers: ['Sprint', 'Average', 'Scored', 'Coverage'], rows: withData.map((p) => [p.sprint, fmt2(p.average), p.participants, formatPercent(p.coverage)] as const) }}
    >
      <Line
        aria-hidden="true"
        data={{
          labels: trend.map((p) => p.sprint),
          datasets: [{ data: trend.map((p) => p.average), borderColor: C.teal, backgroundColor: 'rgba(15,110,120,.12)', fill: true, tension: 0.3, spanGaps: false, pointRadius: 3, pointBackgroundColor: C.navy }],
        }}
        options={base<'line'>({
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { title: (items) => periodTitle(items, periods), afterLabel: (c) => `${trend[c.dataIndex]?.participants ?? 0} engineer(s) scored` } },
          },
          scales: { y: { min: 0, max: 10, grid: { color: C.grid } }, x: { grid: { display: false } } },
        })}
      />
    </ChartPanel>
  );
}

export function MoversChart({ movers, minSprints }: Readonly<{ movers: readonly Mover[]; minSprints: number }>) {
  return (
    <ChartPanel
      title={<>Momentum — biggest movers <span className="font-normal text-muted">(last 3 scored sprints vs the 3 before)</span></>}
      height={340}
      empty={`No engineer in this view has ${minSprints}+ scored sprints to compare.`}
      note={`Only engineers with ${minSprints} or more scored sprints appear, so short-tenure spikes don't distort the view.`}
      summary={`Momentum: ${movers.map((m) => `${m.name} ${m.momentum >= 0 ? '+' : ''}${m.momentum.toFixed(2)}`).join(', ')}.`}
      table={{ headers: ['Engineer', 'Prior 3', 'Last 3', 'Change'], rows: movers.map((m) => [m.name, fmt2(m.prior3), fmt2(m.last3), `${m.momentum >= 0 ? '+' : ''}${m.momentum.toFixed(2)}`] as const) }}
    >
      <Bar
        aria-hidden="true"
        data={{ labels: movers.map((m) => m.name), datasets: [{ data: movers.map((m) => m.momentum), backgroundColor: movers.map((m) => (m.momentum >= 0 ? C.out : C.ni)), borderRadius: 4 }] }}
        options={base<'bar'>({
          indexAxis: 'y',
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (c) => { const m = movers[c.dataIndex]; return m ? `${m.momentum >= 0 ? '+' : ''}${m.momentum.toFixed(2)} (${m.prior3.toFixed(2)} → ${m.last3.toFixed(2)})` : ''; } } },
          },
          scales: { x: { title: { display: true, text: 'Change in average score' }, grid: { color: (c) => (c.tick.value === 0 ? C.navy : C.grid) } }, y: { grid: { display: false } } },
        })}
      />
    </ChartPanel>
  );
}
