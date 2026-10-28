'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { KpiDatasetDto } from '@/application/use-cases/kpi/get-dashboard-dataset';
import { computeDashboard, filterOptions, toRows, type DashboardFilters } from '@/domain/kpi/dashboard';
import { sprintTrend } from '@/domain/kpi/groups';
import { rankByGroup } from '@/domain/kpi/ranking';
import type { SprintCode } from '@/domain/kpi/sprint-code';
import type { BandKey } from '@/domain/settings/kpi-settings';
import { DesignationChart, DistributionChart, MoversChart, TeamChart, TrendChart } from '@/components/charts/kpi-charts';
import { EngineerProfileModal, type ProfileData } from '@/components/employees/engineer-profile-modal';
import { formatDateTime } from '@/components/format';
import { Alert } from '@/components/ui/alert';
import { DataCheckBanner } from './data-check-banner';
import { decodeDataset } from './decode';
import { EngineerTable } from './engineer-table';
import { FilterBar } from './filter-bar';
import { StatCards } from './stat-cards';

const FILTER_KEYS = ['designation', 'team', 'band', 'coverage', 'q'] as const;
const COVERAGE = new Set(['10', '6', 'new']);
const BANDS = new Set(['out', 'exc', 'meet', 'ni']);

function readFilters(params: URLSearchParams): DashboardFilters {
  const get = (k: string) => params.get(k) ?? undefined;
  const coverage = get('coverage');
  const band = get('band');
  return {
    designation: get('designation'),
    team: get('team'),
    q: get('q'),
    coverage: coverage && COVERAGE.has(coverage) ? (coverage as DashboardFilters['coverage']) : undefined,
    band: band && BANDS.has(band) ? (band as BandKey) : undefined,
  };
}

/** Client-side filters update the URL without a server round trip (Next History API integration). */
function writeParams(patch: Record<string, string | undefined>) {
  const params = new URLSearchParams(window.location.search);
  for (const [k, v] of Object.entries(patch)) {
    if (v) params.set(k, v);
    else params.delete(k);
  }
  params.delete('imported');
  const qs = params.toString();
  window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
}

const ACTION = 'inline-flex min-h-10 items-center rounded-md border border-line bg-surface px-3 py-2 text-sm font-semibold text-navy hover:bg-ltbg';

/** Print (US-07-01) and table export (US-07-02) carry the current range and filters. */
function ExportActions({ query }: Readonly<{ query: string }>) {
  const params = new URLSearchParams(query);
  params.delete('imported');
  const qs = params.toString();
  const withFormat = (format: string) => `/api/v1/exports/engineers?${new URLSearchParams([...params.entries(), ['format', format]]).toString()}`;
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <a href={withFormat('xlsx')} className={ACTION} download>Export Excel</a>
      <a href={withFormat('csv')} className={ACTION} download>Export CSV</a>
      <a href={`/print/dashboard${qs ? `?${qs}` : ''}`} target="_blank" rel="noopener" className={ACTION}>Print / PDF</a>
    </div>
  );
}

/** Interactive KPI dashboard (US-05-01…06), recomputed in the browser from the shared domain (ADR-009). */
export function DashboardClient({ dataset }: Readonly<{ dataset: KpiDatasetDto }>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const filters = useMemo(() => readFilters(new URLSearchParams(query)), [query]);
  const imported = searchParams.get('imported');
  const { settings, sprints } = dataset;

  const engineers = useMemo(() => decodeDataset(dataset), [dataset]);
  const allRows = useMemo(() => toRows(engineers, settings), [engineers, settings]);
  const view = useMemo(() => computeDashboard(sprints, engineers, allRows, filters), [sprints, engineers, allRows, filters]);
  const options = useMemo(() => filterOptions(engineers), [engineers]);
  const orgTrend = useMemo(() => sprintTrend({ sprints, engineers: engineers.filter((e) => e.active) }, dataset.activeCount), [sprints, engineers, dataset.activeCount]);
  const designationRanks = useMemo(() => {
    const ranked = allRows.filter((r) => r.overallRank !== null || r.metrics.sprintsCounted > 0).map((r) => ({ id: r.id, name: r.name, designation: r.designation, totalCenti: r.metrics.totalCenti, count: r.metrics.sprintsCounted }));
    return rankByGroup(ranked, (r) => r.designation, settings.rankEligibilityMinSprints);
  }, [allRows, settings.rankEligibilityMinSprints]);
  const [openId, setOpenId] = useState<string | null>(null);

  const profile: ProfileData | null = useMemo(() => {
    const row = allRows.find((r) => r.id === openId);
    const series = engineers.find((e) => e.id === openId);
    if (!row || !series) return null;
    const group = designationRanks.get(row.designation) ?? [];
    return {
      row,
      cells: series.cells,
      rankOf: allRows.filter((r) => r.overallRank !== null).length,
      designationRank: group.find((g) => g.id === row.id)?.rank ?? null,
      designationSize: group.filter((g) => g.rank !== null).length,
    };
  }, [openId, allRows, engineers, designationRanks]);

  const isDefault = FILTER_KEYS.every((k) => !filters[k]);
  const onRange = (from: SprintCode, to: SprintCode) => {
    const params = new URLSearchParams(window.location.search);
    params.set('from', from);
    params.set('to', to);
    params.delete('imported');
    router.replace(`/dashboard?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-navy">KPI Dashboard</h1>
          <p className="text-xs text-muted">
            Sprints {dataset.range.from}–{dataset.range.to} ({sprints.length}) · {dataset.activeCount} engineers
            {dataset.lastImport ? ` · last import ${formatDateTime(dataset.lastImport.committedAt)}` : ''} · Bands:{' '}
            {settings.bands.map((b, i) => `${b.label} ${i === settings.bands.length - 1 ? `< ${settings.bands[i - 1]?.min}` : `≥ ${b.min}`}`).join(' · ')}
          </p>
        </div>
        <ExportActions query={query} />
      </header>

      {imported ? <Alert tone="success" title="Import committed">The dashboard now reflects the uploaded master sheet.</Alert> : null}
      <DataCheckBanner dataCheck={dataset.dataCheck} />

      <FilterBar
        filters={filters}
        options={options}
        bands={settings.bands}
        allSprints={dataset.allSprints}
        range={dataset.range}
        onChange={writeParams}
        onRange={onRange}
        onReset={() => writeParams(Object.fromEntries(FILTER_KEYS.map((k) => [k, undefined])))}
        isDefault={isDefault}
      />

      <StatCards cards={view.cards} bands={settings.bands} />

      <div className="grid gap-4 md:grid-cols-[1.3fr_1fr]">
        <DesignationChart groups={view.byDesignation} />
        <DistributionChart counts={view.cards.bands} bands={settings.bands} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <TeamChart groups={view.byTeam} />
        <TrendChart trend={view.trend} periods={dataset.sprintLabels} />
      </div>
      <MoversChart movers={view.movers} minSprints={settings.momentumMinSprints} />

      <EngineerTable rows={view.rows} bands={settings.bands} onOpen={setOpenId} />

      <EngineerProfileModal profile={profile} sprints={sprints} orgTrend={orgTrend} bands={settings.bands} periods={dataset.sprintLabels} onClose={() => setOpenId(null)} />
    </div>
  );
}
