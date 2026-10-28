import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EmployeeDangerZone } from '@/components/employees/employee-danger-zone';
import { EngineerTrendChart } from '@/components/employees/engineer-trend-chart';
import { ScoreRow } from '@/components/employees/score-row';
import { ProfileStats } from '@/components/employees/profile-stats';
import { getContainer } from '@/infrastructure/container';

export const metadata: Metadata = { title: 'Engineer profile' };

/** Merge candidates shown in the picker; the org has far fewer people. */
const MAX_MERGE_OPTIONS = 500;

/** Bookmarkable engineer profile with every sprint score and its source import (US-06-02). */
export default async function EngineerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { useCases } = await getContainer();
  const result = await useCases.getEngineerProfile.execute({ id });
  if (!result.ok) notFound();
  const p = result.value;
  const e = p.employee;
  const [erasure, list] = await Promise.all([useCases.eraseEmployee.preview(id), useCases.listEmployees.execute({ limit: MAX_MERGE_OPTIONS })]);
  const others = list.items.filter((o) => o.id !== id).map((o) => ({ id: o.id, name: o.displayName, detail: `${o.team.name} · ${o.designation.name}` }));
  return (
    <div className="space-y-4">
      <nav aria-label="Breadcrumb" className="text-xs text-muted">
        <Link href="/employees" className="underline-offset-2 hover:underline">Employees</Link> › <span aria-current="page">{e.displayName}</span>
      </nav>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-navy">{e.displayName}</h1>
          <p className="text-sm text-muted">
            {e.designation.name} · {e.team.name} · Overall rank {p.overallRank ?? '—'} of {p.rankOf}
            {p.designationRank ? ` · ${e.designation.name} rank ${p.designationRank} of ${p.designationSize}` : ''}
            {e.status === 'INACTIVE' ? ' · Inactive' : ''}
          </p>
        </div>
        <Link href={`/print/employees/${e.id}`} className="rounded-md border border-line bg-surface px-4 py-2 text-sm font-semibold text-navy hover:bg-ltbg print:hidden">
          Print appraisal
        </Link>
      </header>
      <ProfileStats m={p.metrics} bands={p.bands} />
      <section className="rounded-xl border border-line bg-surface p-4">
        <h2 className="mb-2 text-sm font-bold text-navy">Score per sprint</h2>
        <EngineerTrendChart
          name={e.displayName}
          sprints={p.sprints}
          scores={p.series.map((s) => (typeof s.cell === 'number' ? s.cell : null))}
          orgAverages={p.series.map((s) => s.orgAverage)}
          periods={p.sprintLabels}
        />
      </section>
      <section aria-labelledby="scores-title" className="rounded-xl border border-line bg-surface p-4">
        <h2 id="scores-title" className="mb-3 text-sm font-bold text-navy">Sprint scores</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="bg-navy text-[11px] uppercase tracking-wide text-white">
                <th scope="col" className="px-3 py-2">Sprint</th>
                <th scope="col" className="px-3 py-2 text-right">Score</th>
                <th scope="col" className="px-3 py-2 text-right">Org average</th>
                <th scope="col" className="px-3 py-2">Source import</th>
                <th scope="col" className="px-3 py-2 text-right print:hidden"><span className="sr-only">Correct</span></th>
              </tr>
            </thead>
            <tbody>
              {p.series.map((s) => <ScoreRow key={s.sprint} employeeId={e.id} row={s} />)}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-muted">Corrections need a reason, are audited, and block rollback of earlier imports.</p>
      </section>
      <EmployeeDangerZone id={e.id} name={e.displayName} uploads={erasure?.uploads ?? 0} options={others} />
    </div>
  );
}
