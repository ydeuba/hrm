import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { Alert } from '@/components/ui/alert';
import { getContainer } from '@/infrastructure/container';

export const metadata: Metadata = { title: 'Dashboard' };

const SPRINT = /^S\d{1,6}$/i;
const pick = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function EmptyState() {
  return (
    <section aria-labelledby="dash-title" className="space-y-4">
      <h1 id="dash-title" className="text-xl font-bold text-navy">KPI Dashboard</h1>
      <div className="rounded-xl border border-line border-l-4 border-l-teal bg-surface p-6">
        <h2 className="text-base font-semibold text-navy">No KPI data yet</h2>
        <p className="mt-1 text-sm text-muted">Upload the KPI master sheet to populate the dashboard.</p>
        <Link href="/imports" className="mt-4 inline-block rounded-md bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-strong">
          Upload KPI master sheet
        </Link>
      </div>
    </section>
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const from = pick(sp.from);
  const to = pick(sp.to);
  const { useCases } = await getContainer();
  const result = await useCases.getDashboardDataset.execute({
    from: from && SPRINT.test(from) ? (from.toUpperCase() as `S${number}`) : undefined,
    to: to && SPRINT.test(to) ? (to.toUpperCase() as `S${number}`) : undefined,
    includeInactive: false,
  });
  if (!result.ok) {
    return (
      <Alert tone="warning" title="That sprint range isn't available">
        <Link href="/dashboard" className="underline">Show all sprints</Link>
      </Alert>
    );
  }
  if (result.value.engineers.length === 0 || result.value.sprints.length === 0) return <EmptyState />;
  return (
    <Suspense>
      <DashboardClient dataset={result.value} />
    </Suspense>
  );
}
