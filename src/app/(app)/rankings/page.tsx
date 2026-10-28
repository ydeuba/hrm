import type { Metadata } from 'next';
import Link from 'next/link';
import type { GroupSummariesDto } from '@/application/use-cases/kpi/get-group-summaries';
import type { RankingScope } from '@/application/use-cases/kpi/get-rankings';
import { fmt2, formatPercent } from '@/components/format';
import { RankingTable } from '@/components/rankings/ranking-table';
import { Alert } from '@/components/ui/alert';
import { getContainer } from '@/infrastructure/container';

export const metadata: Metadata = { title: 'Rankings' };

type Tab = RankingScope | 'summaries';
const TABS: { key: Tab; label: string }[] = [
  { key: 'overall', label: 'Overall' },
  { key: 'designation', label: 'By designation' },
  { key: 'lastN', label: 'Last N sprints' },
  { key: 'summaries', label: 'Summaries' },
];

const th = 'px-3 py-2';
const td = 'px-3 py-1.5';

function GroupTable({ title, rows, withRank }: { title: string; rows: GroupSummariesDto['teams']; withRank: boolean }) {
  return (
    <section aria-label={title} className="rounded-xl border border-line bg-surface p-4">
      <h2 className="mb-3 text-sm font-bold text-navy">{title}</h2>
      <table className="w-full text-left text-[13px]">
        <thead>
          <tr className="bg-navy text-[11px] uppercase text-white">
            <th scope="col" className={th}>{withRank ? 'Team' : 'Designation'}</th>
            <th scope="col" className={`${th} text-right`}>People</th>
            <th scope="col" className={`${th} text-right`}>Score obs</th>
            {withRank ? <th scope="col" className={`${th} text-right`}>Total score</th> : null}
            <th scope="col" className={`${th} text-right`}>Weighted avg</th>
            {withRank ? <th scope="col" className={`${th} text-right`}>Rank</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((g) => (
            <tr key={g.key} className="border-b border-line even:bg-zebra">
              <td className={td}>{g.key}</td>
              <td className={`${td} tabular text-right`}>{g.people}</td>
              <td className={`${td} tabular text-right`}>{g.scoreObs}</td>
              {withRank ? <td className={`${td} tabular text-right`}>{fmt2(g.totalCenti / 100)}</td> : null}
              <td className={`${td} tabular text-right font-bold`}>{fmt2(g.weightedAverage)}</td>
              {withRank ? <td className={`${td} tabular text-right`}>{g.rank ?? '—'}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Summaries({ s }: { s: GroupSummariesDto }) {
  const h = s.headline;
  return (
    <div className="space-y-4">
      <section aria-label="Headline" className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          ['Resources', String(h.resources)],
          ['Overall avg', fmt2(h.overallAvg)],
          ['Latest sprint', h.latestSprint ?? '—'],
          ['Latest sprint avg', fmt2(h.latestAvg)],
          ['Latest coverage', formatPercent(h.latestCoverage)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-line border-l-4 border-l-teal bg-surface px-4 py-3">
            <div className="text-[11px] font-bold uppercase text-muted">{k}</div>
            <div className="tabular text-xl font-extrabold text-navy">{v}</div>
          </div>
        ))}
      </section>
      {s.interpretation ? (
        <section aria-label="Interpretation" className="rounded-xl border border-line bg-surface p-4 text-sm">
          <h2 className="mb-1 text-sm font-bold text-navy">Interpretation</h2>
          <p>{s.interpretation}</p>
        </section>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <GroupTable title="Team summary" rows={s.teams} withRank />
        <GroupTable title="Designation summary" rows={s.designations} withRank={false} />
      </div>
      <section aria-label={`Top ${s.topN.length} performers`} className="rounded-xl border border-line bg-surface p-4">
        <h2 className="mb-3 text-sm font-bold text-navy">Top {s.topN.length} performers <span className="font-normal text-muted">(at least {s.topNMinSprints} sprints)</span></h2>
        <ol className="space-y-1 text-[13px]">
          {s.topN.map((r) => (
            <li key={r.employeeId} className="flex flex-wrap gap-x-3">
              <span className="tabular w-6 text-right font-extrabold text-navy">{r.rank}</span>
              <Link href={`/employees/${r.employeeId}`} className="text-teal underline-offset-2 hover:underline">{r.name}</Link>
              <span className="text-muted">{r.designation} · {r.team} · {r.sprints} sprints</span>
              <span className="tabular font-bold">{r.average.toFixed(2)}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

/** Rankings replacing the master sheet's ranking blocks and Performance Insights (US-06-02/03). */
export default async function RankingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const raw = (await searchParams).tab;
  const tab: Tab = TABS.some((t) => t.key === raw) ? (raw as Tab) : 'overall';
  const { useCases } = await getContainer();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-xl font-bold text-navy">Rankings</h1>
        <a href="/api/v1/exports/rankings" download className="inline-flex min-h-10 items-center rounded-md border border-line bg-surface px-3 py-2 text-sm font-semibold text-navy hover:bg-ltbg print:hidden">
          Export workbook
        </a>
      </div>
      <nav aria-label="Ranking views" className="flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/rankings?tab=${t.key}`}
            aria-current={tab === t.key ? 'page' : undefined}
            className={`whitespace-nowrap px-3 py-2 text-sm ${tab === t.key ? 'border-b-2 border-teal font-bold text-navy' : 'text-muted hover:text-navy'}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {tab === 'summaries' ? await renderSummaries(useCases) : await renderRankings(useCases, tab)}
    </div>
  );
}

type UseCases = Awaited<ReturnType<typeof getContainer>>['useCases'];

async function renderSummaries(useCases: UseCases) {
  const s = await useCases.getGroupSummaries.execute({});
  if (!s.ok || s.value.headline.resources === 0) return <Alert tone="info">No KPI data yet. Upload the master sheet on the Imports page.</Alert>;
  return <Summaries s={s.value} />;
}

async function renderRankings(useCases: UseCases, scope: RankingScope) {
  const r = await useCases.getRankings.execute({ scope });
  if (!r.ok || r.value.groups.every((g) => g.rows.length === 0)) return <Alert tone="info">No KPI data yet. Upload the master sheet on the Imports page.</Alert>;
  const d = r.value;
  const windowLabel = d.window.length ? `${d.window[0]}–${d.window.at(-1)}` : '';
  return (
    <div className="space-y-4">
      {scope === 'lastN' ? <p className="text-sm text-muted">Window: last {d.window.length} sprints with scores ({windowLabel}).</p> : null}
      {d.groups.map((g) => (
        <RankingTable key={g.key} title={g.key === 'all' ? (scope === 'lastN' ? `Last ${d.window.length} sprints (${windowLabel})` : 'Overall ranking') : g.key} rows={g.rows} minSprints={d.minSprints} />
      ))}
    </div>
  );
}
