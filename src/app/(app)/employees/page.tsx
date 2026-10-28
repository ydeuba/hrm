import type { Metadata } from 'next';
import Link from 'next/link';
import { EmployeeEditor } from '@/components/employees/employee-editor';
import { LabelEditor } from '@/components/employees/label-editor';
import { Alert } from '@/components/ui/alert';
import { getContainer } from '@/infrastructure/container';

export const metadata: Metadata = { title: 'Employees' };

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
const control = 'rounded-md border border-line bg-surface px-2.5 py-2 text-sm';
const th = 'px-3 py-2';
const td = 'px-3 py-1.5';

/** Employees (US-03-01/02) and Teams & designations (US-03-03). */
export default async function EmployeesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const tab = one(sp.tab) === 'labels' ? 'labels' : 'people';
  const { useCases } = await getContainer();
  const [teams, designations] = await Promise.all([useCases.manageLabels.list('team'), useCases.manageLabels.list('designation')]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-navy">Employees</h1>
      {one(sp.erased) ? <Alert tone="success" title="Employee erased">Their data was deleted and every reference was redacted.</Alert> : null}      <nav aria-label="Employee views" className="flex gap-1 border-b border-line">
        {[['people', 'People', '/employees'], ['labels', 'Teams & designations', '/employees?tab=labels']].map(([k, l, href]) => (
          <Link key={k} href={href ?? '/employees'} aria-current={tab === k ? 'page' : undefined} className={`px-3 py-2 text-sm ${tab === k ? 'border-b-2 border-teal font-bold text-navy' : 'text-muted hover:text-navy'}`}>{l}</Link>
        ))}
      </nav>
      {tab === 'labels' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {([['Teams', 'teams', teams], ['Designations', 'designations', designations]] as const).map(([title, kind, rows]) => (
            <section key={kind} aria-label={title} className="rounded-xl border border-line bg-surface p-4">
              <h2 className="mb-2 text-sm font-bold text-navy">{title}</h2>
              <p className="mb-2 text-xs text-muted">Renaming keeps the old name so later imports still match. Labels in use can’t be deleted.</p>
              <table className="w-full text-left text-[13px]"><tbody>{rows.map((r) => <LabelEditor key={r.id} kind={kind} label={r} />)}</tbody></table>
            </section>
          ))}
        </div>
      ) : (
        <People sp={sp} teams={teams} designations={designations} />
      )}
    </div>
  );
}

async function People({ sp, teams, designations }: { sp: Search; teams: { id: string; name: string }[]; designations: { id: string; name: string }[] }) {
  const { useCases } = await getContainer();
  const status = one(sp.status);
  const result = await useCases.listEmployees.execute({
    q: one(sp.q), teamId: one(sp.teamId), designationId: one(sp.designationId),
    status: status === 'ACTIVE' || status === 'INACTIVE' ? status : undefined, cursor: one(sp.cursor), limit: 200,
  });
  return (
    <>
      <form method="get" role="search" className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface px-4 py-3">
        <div>
          <label htmlFor="eq" className="mb-1 block text-[11px] font-bold uppercase text-muted">Search</label>
          <input id="eq" name="q" type="search" defaultValue={one(sp.q)} placeholder="Name or code" className={control} />
        </div>
        <div>
          <label htmlFor="et" className="mb-1 block text-[11px] font-bold uppercase text-muted">Team</label>
          <select id="et" name="teamId" defaultValue={one(sp.teamId) ?? ''} className={control}>
            <option value="">All teams</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="ed" className="mb-1 block text-[11px] font-bold uppercase text-muted">Designation</label>
          <select id="ed" name="designationId" defaultValue={one(sp.designationId) ?? ''} className={control}>
            <option value="">All designations</option>
            {designations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="es" className="mb-1 block text-[11px] font-bold uppercase text-muted">Status</label>
          <select id="es" name="status" defaultValue={status ?? ''} className={control}>
            <option value="">Any</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
        <button type="submit" className="min-h-10 rounded-md bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-strong">Apply</button>
        <Link href="/employees" className="min-h-10 px-2 py-2 text-sm text-teal underline-offset-2 hover:underline">Reset</Link>
      </form>
      <section aria-label="Employee list" className="rounded-xl border border-line bg-surface p-4">
        {result.items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No employees match. Import the KPI master sheet to add employees.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="bg-navy text-[11px] uppercase tracking-wide text-white">
                  <th scope="col" className={th}>Name</th>
                  <th scope="col" className={th}>Code</th>
                  <th scope="col" className={th}>Team</th>
                  <th scope="col" className={th}>Designation</th>
                  <th scope="col" className={th}>Status</th>
                  <th scope="col" className={`${th} text-right`}>Sprints scored</th>
                  <th scope="col" className={th}><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((e) => (
                  <tr key={e.id} className="border-b border-line even:bg-zebra">
                    <td className={td}><Link href={`/employees/${e.id}`} className="text-teal underline-offset-2 hover:underline">{e.displayName}</Link></td>
                    <td className={td}>{e.employeeCode ?? '—'}</td>
                    <td className={td}>{e.team.name}{e.teamLocked ? ' 🔒' : ''}</td>
                    <td className={td}>{e.designation.name}{e.designationLocked ? ' 🔒' : ''}</td>
                    <td className={td}>{e.status === 'ACTIVE' ? 'Active' : 'Inactive'}</td>
                    <td className={`${td} tabular text-right`}>{e.sprintsScored}</td>
                    <td className={`${td} text-right`}><EmployeeEditor employee={e} teams={teams} designations={designations} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {result.nextCursor ? (
          <Link href={`/employees?${new URLSearchParams({ ...Object.fromEntries(Object.entries(sp).filter(([, v]) => typeof v === 'string') as [string, string][]), cursor: result.nextCursor })}`} className="mt-3 inline-block text-sm font-semibold text-teal">
            Next page →
          </Link>
        ) : null}
      </section>
    </>
  );
}
