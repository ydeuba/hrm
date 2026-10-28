import type { Metadata } from 'next';
import Link from 'next/link';
import { PrintDashboard } from '@/components/print/print-dashboard';
import { Alert } from '@/components/ui/alert';
import { getContainer } from '@/infrastructure/container';

export const metadata: Metadata = { title: 'KPI Dashboard — print' };

const SPRINT = /^S\d{1,6}$/i;
const BANDS = new Set(['out', 'exc', 'meet', 'ni']);
const COVERAGE = new Set(['10', '6', 'new']);
const pick = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const sprint = (v?: string) => (v && SPRINT.test(v) ? (v.toUpperCase() as `S${number}`) : undefined);

/** /print/dashboard?<dashboard filters> — A4 print view of the dashboard (US-07-01). */
export default async function PrintDashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { useCases, clock } = await getContainer();
  const result = await useCases.getDashboardDataset.execute({ from: sprint(pick(sp.from)), to: sprint(pick(sp.to)), includeInactive: false });
  if (!result.ok || result.value.sprints.length === 0) {
    return (
      <Alert tone="warning" title="Nothing to print">
        <Link href="/dashboard" className="underline">Back to the dashboard</Link>
      </Alert>
    );
  }
  const band = pick(sp.band);
  const coverage = pick(sp.coverage);
  const filters = {
    designation: pick(sp.designation),
    team: pick(sp.team),
    q: pick(sp.q),
    band: band && BANDS.has(band) ? (band as 'out' | 'exc' | 'meet' | 'ni') : undefined,
    coverage: coverage && COVERAGE.has(coverage) ? (coverage as '10' | '6' | 'new') : undefined,
  };
  return <PrintDashboard dataset={result.value} filters={filters} generatedAt={clock.now().toISOString()} autoPrint={pick(sp.autoprint) !== '0'} />;
}
