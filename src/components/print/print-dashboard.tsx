'use client';

import { useMemo } from 'react';
import type { KpiDatasetDto } from '@/application/use-cases/kpi/get-dashboard-dataset';
import { computeDashboard, toRows, type DashboardFilters, type EngineerRow } from '@/domain/kpi/dashboard';
import type { BandDef } from '@/domain/settings/kpi-settings';
import { DesignationChart, DistributionChart, MoversChart, TeamChart, TrendChart } from '@/components/charts/kpi-charts';
import { BandPill, DeltaText, bandLabel } from '@/components/dashboard/band';
import { decodeDataset } from '@/components/dashboard/decode';
import { StatCards } from '@/components/dashboard/stat-cards';
import { fmt2, formatDateTime } from '@/components/format';
import { AutoPrint } from './auto-print';
const COVERAGE_LABEL: Record<NonNullable<DashboardFilters['coverage']>, string> = { all: 'All', '10': '10+ sprints', '6': '6+ sprints', new: 'New (< 6 sprints)' };

export function describeFilters(f: DashboardFilters, bands: readonly BandDef[]): string {
  const parts = [
    f.designation ? `Designation: ${f.designation}` : null,
    f.team ? `Team: ${f.team}` : null,
    f.band ? `Rating: ${bandLabel(f.band, bands)}` : null,
    f.coverage && f.coverage !== 'all' ? `Coverage: ${COVERAGE_LABEL[f.coverage]}` : null,
    f.q ? `Search: “${f.q}”` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'All engineers';
}

function PrintTable({ rows, bands }: Readonly<{ rows: readonly EngineerRow[]; bands: readonly BandDef[] }>) {
  const sorted = [...rows].sort((a, b) => (a.overallRank ?? 1e9) - (b.overallRank ?? 1e9) || a.name.localeCompare(b.name));
  const heads = ['Rank', 'Name', 'Team', 'Designation', 'Sprints', 'Total', 'Avg', 'Last 3', 'Momentum', 'Rating'];
  return (
    <div role="region" aria-label="Engineers" className="mt-4">
      <h2 className="mb-2 text-sm font-bold text-navy">Engineers ({sorted.length})</h2>
      <table className="w-full text-left text-[11px]">
        <thead>
          <tr className="border-b-2 border-navy">{heads.map((h) => <th key={h} scope="col" className="px-1.5 py-1 font-bold uppercase">{h}</th>)}</tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.id} className="break-inside-avoid border-b border-line">
              <td className="tabular px-1.5 py-1 font-bold">{r.overallRank ?? '—'}</td>
              <td className="px-1.5 py-1">{r.name}</td>
              <td className="px-1.5 py-1">{r.team}</td>
              <td className="px-1.5 py-1">{r.designation}</td>
              <td className="tabular px-1.5 py-1 text-right">{r.metrics.sprintsCounted}</td>
              <td className="tabular px-1.5 py-1 text-right">{fmt2(r.metrics.total)}</td>
              <td className="tabular px-1.5 py-1 text-right font-bold">{fmt2(r.metrics.displayAverage)}</td>
              <td className="tabular px-1.5 py-1 text-right">{fmt2(r.metrics.last3)}</td>
              <td className="tabular px-1.5 py-1 text-right"><DeltaText value={r.metrics.momentum} /></td>
              <td className="px-1.5 py-1"><BandPill band={r.metrics.band} bands={bands} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Print view (US-07-01, ADR-012). The page body sits inside a table whose
 * <thead>/<tfoot> browsers repeat on every printed page, giving each page the
 * filter/range header and the confidential footer.
 */
export function PrintDashboard({ dataset, filters, generatedAt, autoPrint }: Readonly<{ dataset: KpiDatasetDto; filters: DashboardFilters; generatedAt: string; autoPrint: boolean }>) {
  const { settings, sprints } = dataset;
  const view = useMemo(() => {
    const engineers = decodeDataset(dataset);
    return computeDashboard(sprints, engineers, toRows(engineers, settings), filters);
  }, [dataset, sprints, settings, filters]);

  return (
    <table className="print-frame w-full">
      <thead>
        <tr>
          <td>
            <header className="mb-3 flex items-end justify-between gap-3 border-b-2 border-navy pb-2">
              <div>
                <h1 className="text-lg font-bold text-navy">Cloudtech Services · KPI Dashboard</h1>
                <p className="text-[11px] text-muted" data-testid="print-filters">
                  Sprints {dataset.range.from}–{dataset.range.to} ({sprints.length}) · {describeFilters(filters, settings.bands)}
                </p>
              </div>
              <p className="text-[11px] text-muted">Generated {formatDateTime(generatedAt)}</p>
            </header>
          </td>
        </tr>
      </thead>
      <tfoot>
        <tr>
          <td>
            <footer className="mt-3 border-t border-line pt-1 text-center text-[10px] text-muted">Cloudtech Services · Confidential</footer>
          </td>
        </tr>
      </tfoot>
      <tbody>
        <tr>
          <td className="space-y-3">
            <AutoPrint enabled={autoPrint} />
            <StatCards cards={view.cards} bands={settings.bands} />
            <div className="grid grid-cols-2 gap-3">
              <DesignationChart groups={view.byDesignation} />
              <DistributionChart counts={view.cards.bands} bands={settings.bands} />
              <TeamChart groups={view.byTeam} />
              <TrendChart trend={view.trend} periods={dataset.sprintLabels} />
            </div>
            <MoversChart movers={view.movers} minSprints={settings.momentumMinSprints} />
            <PrintTable rows={view.rows} bands={settings.bands} />
          </td>
        </tr>
      </tbody>
    </table>
  );
}
