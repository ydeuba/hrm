import type { EngineerProfileDto } from '@/application/use-cases/kpi/get-engineer-profile';
import { EngineerTrendChart } from '@/components/employees/engineer-trend-chart';
import { ProfileStats } from '@/components/employees/profile-stats';
import { bandLabel } from '@/components/dashboard/band';
import { formatDateTime } from '@/components/format';

const cellText = (c: number | 'R' | null) => (c === 'R' ? 'RUN' : c === null ? '—' : c.toFixed(2));

/** One A4 appraisal page (US-07-04): stats, trend, ranks, rating, range, confidential footer. */
export function AppraisalSummary({ p, generatedAt }: Readonly<{ p: EngineerProfileDto; generatedAt: string }>) {
  const e = p.employee;
  const range = p.sprints.length ? `${p.sprints[0]}–${p.sprints.at(-1)} (${p.sprints.length} sprints)` : 'No sprints';
  return (
    <article aria-label={`Appraisal summary: ${e.displayName}`} className="appraisal-page flex flex-col gap-3">
      <header className="flex items-end justify-between gap-3 border-b-2 border-navy pb-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Cloudtech Services · Appraisal summary</p>
          <h1 className="text-xl font-bold text-navy">{e.displayName}</h1>
          <p className="text-xs text-muted">
            {e.designation.name} · {e.team.name}
            {e.employeeCode ? ` · ${e.employeeCode}` : ''}
            {e.status === 'INACTIVE' ? ' · Inactive' : ''}
          </p>
        </div>
        <dl className="grid grid-cols-[auto_auto] gap-x-3 text-right text-xs">
          <dt className="text-muted">Overall rank</dt>
          <dd className="font-bold text-navy">{p.overallRank ?? '—'} of {p.rankOf}</dd>
          <dt className="text-muted">{e.designation.name} rank</dt>
          <dd className="font-bold text-navy">{p.designationRank ?? '—'} of {p.designationSize}</dd>
          <dt className="text-muted">Rating</dt>
          <dd className="font-bold text-navy">{bandLabel(p.metrics.band, p.bands)}</dd>
          <dt className="text-muted">Sprint range</dt>
          <dd className="font-bold text-navy">{range}</dd>
        </dl>
      </header>
      <ProfileStats m={p.metrics} bands={p.bands} />
      <section className="rounded-xl border border-line p-3">
        <h2 className="mb-1 text-sm font-bold text-navy">Score per sprint vs org average</h2>
        <EngineerTrendChart
          name={e.displayName}
          sprints={p.sprints}
          scores={p.series.map((s) => (typeof s.cell === 'number' ? s.cell : null))}
          orgAverages={p.series.map((s) => s.orgAverage)}
          periods={p.sprintLabels}
        />
      </section>
      <section aria-label="Sprint scores">
        <table className="w-full text-center text-[10px]">
          <tbody>
            <tr className="border-b border-line font-bold text-muted">{p.series.map((s) => <td key={s.sprint} className="px-0.5 py-0.5">{s.sprint}</td>)}</tr>
            <tr className="tabular">{p.series.map((s) => <td key={s.sprint} className="px-0.5 py-0.5">{cellText(s.cell)}</td>)}</tr>
          </tbody>
        </table>
      </section>
      <footer className="mt-auto flex justify-between border-t border-line pt-1 text-[10px] text-muted">
        <span>Cloudtech Services · Confidential</span>
        <span>Generated {formatDateTime(generatedAt)}</span>
      </footer>
    </article>
  );
}
