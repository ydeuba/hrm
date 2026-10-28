import type { Metadata } from 'next';
import Link from 'next/link';
import { AUDIT_ACTIONS } from '@/application/ports/audit-log';
import type { AuditEventDto } from '@/application/use-cases/audit/list-audit-events';
import { AuditQuerySchema, toAuditQuery, type AuditFilter } from '@/app/_lib/audit-query';
import { formatDateTime } from '@/components/format';
import { Alert } from '@/components/ui/alert';
import { getContainer } from '@/infrastructure/container';

export const metadata: Metadata = { title: 'Audit log' };

const pick = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
const show = (v: unknown) => (v === undefined ? '—' : JSON.stringify(v));
const input = 'min-h-10 rounded-md border border-line bg-surface px-2 py-1.5 text-sm';

function Details({ e }: { e: AuditEventDto }) {
  const hasMeta = e.meta !== null && e.meta !== undefined;
  if (e.changes.length === 0 && !hasMeta) return <span className="text-muted">—</span>;
  return (
    <details>
      <summary className="cursor-pointer text-teal">{e.changes.length ? `${e.changes.length} change${e.changes.length === 1 ? '' : 's'}` : 'Details'}</summary>
      {e.changes.length ? (
        <table className="mt-2 w-full text-left text-xs">
          <thead><tr className="text-muted"><th scope="col" className="pr-2">Field</th><th scope="col" className="pr-2">Before</th><th scope="col">After</th></tr></thead>
          <tbody>
            {e.changes.map((c) => (
              <tr key={c.path} className="border-t border-line align-top">
                <td className="pr-2 font-mono">{c.path || '(value)'}</td>
                <td className="break-all pr-2 text-band-ni">{show(c.before)}</td>
                <td className="break-all text-band-out">{show(c.after)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {hasMeta ? <pre className="mt-2 whitespace-pre-wrap break-all rounded bg-ltbg p-2 text-[11px]">{JSON.stringify(e.meta, null, 2)}</pre> : null}
    </details>
  );
}

function Filters({ f }: { f: AuditFilter }) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface p-3" aria-label="Audit filters">
      <label className="flex flex-col text-xs font-semibold text-muted">From<input type="date" name="from" defaultValue={f.from} className={input} /></label>
      <label className="flex flex-col text-xs font-semibold text-muted">To<input type="date" name="to" defaultValue={f.to} className={input} /></label>
      <label className="flex flex-col text-xs font-semibold text-muted">
        Action
        <select name="action" defaultValue={f.action ?? ''} className={input}>
          <option value="">All actions</option>
          {AUDIT_ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </label>
      <button type="submit" className="min-h-10 rounded-md bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-strong">Apply</button>
      <Link href="/audit" className="min-h-10 px-2 py-2 text-sm text-teal">Reset</Link>
    </form>
  );
}

/** Read-only audit trail (US-09-02): newest first, date/action filters, cursor pages, before/after diffs. */
export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const parsed = AuditQuerySchema.safeParse({ from: pick(sp.from), to: pick(sp.to), action: pick(sp.action), cursor: pick(sp.cursor) });
  const f: AuditFilter = parsed.success ? parsed.data : {};
  const { useCases } = await getContainer();
  const { items, nextCursor } = await useCases.listAuditEvents.execute(toAuditQuery(f));
  const next = new URLSearchParams(Object.entries({ ...f, cursor: nextCursor ?? '' }).filter((kv): kv is [string, string] => Boolean(kv[1])));
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold text-navy">Audit log</h1>
        <p className="text-sm text-muted">Every sign-in, import, edit, settings change and backup. Times are Asia/Kathmandu. Read-only.</p>
      </header>
      {parsed.success ? null : <Alert tone="warning" title="Some filters were invalid and were ignored." />}
      <Filters f={f} />
      <section aria-label="Audit events" className="rounded-xl border border-line bg-surface p-4">
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No events match these filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="bg-navy text-[11px] uppercase tracking-wide text-white">
                  <th scope="col" className="px-3 py-2">Time</th>
                  <th scope="col" className="px-3 py-2">Action</th>
                  <th scope="col" className="px-3 py-2">By</th>
                  <th scope="col" className="px-3 py-2">Entity</th>
                  <th scope="col" className="px-3 py-2">Changes</th>
                </tr>
              </thead>
              <tbody>
                {items.map((e) => (
                  <tr key={e.id} className="border-b border-line align-top even:bg-zebra">
                    <td className="whitespace-nowrap px-3 py-1.5">{formatDateTime(e.at)}</td>
                    <td className="px-3 py-1.5 font-mono text-xs">{e.action}</td>
                    <td className="px-3 py-1.5">{e.actorEmail ?? '—'}</td>
                    <td className="px-3 py-1.5 text-xs">{e.entity ? `${e.entity}${e.entityId ? ` · ${e.entityId.slice(0, 10)}` : ''}` : '—'}</td>
                    <td className="px-3 py-1.5"><Details e={e} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {nextCursor ? (
          <div className="mt-3 text-right">
            <Link href={`/audit?${next.toString()}`} className="text-sm font-semibold text-teal">Older events →</Link>
          </div>
        ) : null}
      </section>
    </div>
  );
}
