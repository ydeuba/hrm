import Link from 'next/link';
import type { RankingRowDto } from '@/application/use-cases/kpi/get-rankings';
import { fmt2 } from '@/components/format';

const display = (avg: number | null) => (avg === null ? null : Math.round(avg * 100 + 1e-9) / 100);

/** Ranked rows plus a "not yet eligible" list (US-06-02 AC-3). */
export function RankingTable({ title, rows, minSprints }: Readonly<{ title: string; rows: readonly RankingRowDto[]; minSprints: number }>) {
  const ranked = rows.filter((r) => r.eligible);
  const pending = rows.filter((r) => !r.eligible);
  return (
    <section aria-label={title} className="rounded-xl border border-line bg-surface p-4">
      <h2 className="mb-3 text-sm font-bold text-navy">{title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="bg-navy text-[11px] uppercase tracking-wide text-white">
              <th scope="col" className="px-3 py-2 text-right">Rank</th>
              <th scope="col" className="px-3 py-2">Name</th>
              <th scope="col" className="px-3 py-2">Designation</th>
              <th scope="col" className="px-3 py-2">Team</th>
              <th scope="col" className="px-3 py-2 text-right">Sprints</th>
              <th scope="col" className="px-3 py-2 text-right">Avg score</th>
              <th scope="col" className="px-3 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((r) => (
              <tr key={r.employeeId} className="border-b border-line even:bg-zebra">
                <td className="tabular px-3 py-1.5 text-right font-extrabold text-navy">{r.rank}</td>
                <td className="px-3 py-1.5"><Link href={`/employees/${r.employeeId}`} className="text-teal underline-offset-2 hover:underline">{r.name}</Link></td>
                <td className="px-3 py-1.5">{r.designation}</td>
                <td className="px-3 py-1.5">{r.team}</td>
                <td className="tabular px-3 py-1.5 text-right">{r.sprints}</td>
                <td className="tabular px-3 py-1.5 text-right font-bold" title={r.average === null ? undefined : `Exact ${r.average.toFixed(3)}`}>{fmt2(display(r.average))}</td>
                <td className="tabular px-3 py-1.5 text-right">{fmt2(r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pending.length ? (
        <div className="mt-3 text-xs text-muted">
          <p className="font-semibold">Not yet eligible (fewer than {minSprints} scored sprints):</p>
          <p>{pending.map((r) => `${r.name} (${r.sprints})`).join(', ')}</p>
        </div>
      ) : null}
    </section>
  );
}
