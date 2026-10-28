'use client';

import { useRouter } from 'next/navigation';
import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { CellDto, ImportPreviewDto } from '@/application/use-cases/imports/preview-dto';
import { formatDateTime } from '@/components/format';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

type TabKey = 'new' | 'changes' | 'scores' | 'warnings' | 'errors';

const cell = (c: CellDto | 'ABSENT') => (c === 'ABSENT' ? '—' : c === null ? 'N/A' : c === 'RUN' ? 'RUN' : c.toFixed(2));

function Th({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <th scope="col" className={`px-3 py-2 ${className}`}>{children}</th>;
}

function Table({ head, rows, empty }: { head: ReactNode; rows: ReactNode[]; empty: string }) {
  if (rows.length === 0) return <p className="py-4 text-sm text-muted">{empty}</p>;
  return (
    <div className="max-h-[28rem] overflow-auto">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0"><tr className="bg-navy text-xs uppercase tracking-wide text-white">{head}</tr></thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  );
}

const ROW = 'border-b border-line even:bg-zebra';
const TD = 'px-3 py-1.5';

function NewTab({ p }: { p: ImportPreviewDto }) {
  return (
    <Table
      empty="No new employees."
      head={<><Th>Name</Th><Th>Team</Th><Th>Designation</Th></>}
      rows={p.newEmployees.map((e) => (
        <tr key={e.name} className={ROW}><td className={TD}>{e.name}</td><td className={TD}>{e.team}</td><td className={TD}>{e.designation}</td></tr>
      ))}
    />
  );
}

function ChangesTab({ p }: { p: ImportPreviewDto }) {
  const rows = [
    ...p.newTeams.map((t) => ({ k: `t-${t}`, what: 'New team', who: t, detail: '' })),
    ...p.newDesignations.map((d) => ({ k: `d-${d}`, what: 'New designation', who: d, detail: '' })),
    ...p.attributeChanges.map((c) => ({ k: `${c.employeeId}-${c.field}`, what: c.field === 'team' ? 'Team change' : 'Designation change', who: c.name, detail: `${c.from} → ${c.to}` })),
    ...p.notInFile.map((e) => ({ k: `nf-${e.employeeId}`, what: 'Not in this file (kept)', who: e.name, detail: '' })),
  ];
  return (
    <Table
      empty="No team, designation or employee changes."
      head={<><Th>Change</Th><Th>Name</Th><Th>Detail</Th></>}
      rows={rows.map((r) => <tr key={r.k} className={ROW}><td className={TD}>{r.what}</td><td className={TD}>{r.who}</td><td className={TD}>{r.detail}</td></tr>)}
    />
  );
}

function ScoresTab({ p }: { p: ImportPreviewDto }) {
  return (
    <Table
      empty="No score changes."
      head={<><Th>Name</Th><Th>Sprint</Th><Th className="text-right">Before</Th><Th className="text-right">After</Th></>}
      rows={p.scoreChanges.map((s) => (
        <tr key={`${s.name}-${s.sprint}`} className={ROW}>
          <td className={TD}>{s.name}</td><td className={TD}>{s.sprint}</td>
          <td className={`${TD} tabular text-right`}>{cell(s.from)}</td><td className={`${TD} tabular text-right`}>{cell(s.to)}</td>
        </tr>
      ))}
    />
  );
}

function IssuesTab({ issues, empty }: { issues: ImportPreviewDto['issues']; empty: string }) {
  return (
    <Table
      empty={empty}
      head={<><Th>Row</Th><Th>Column</Th><Th>Issue</Th></>}
      rows={issues.map((i, n) => (
        <tr key={`${i.code}-${i.row}-${i.column}-${n}`} className={ROW}>
          <td className={`${TD} tabular`}>{i.row ?? '—'}</td><td className={TD}>{i.column ?? '—'}</td><td className={TD}>{i.message}</td>
        </tr>
      ))}
    />
  );
}

function Stat({ label, value, tone = '' }: { label: string; value: number | string; tone?: string }) {
  return (
    <div className="rounded-lg bg-ltbg px-3 py-2">
      <div className="text-[11px] font-bold uppercase tracking-wide text-muted">{label}</div>
      <div className={`tabular text-lg font-extrabold text-navy ${tone}`}>{value}</div>
    </div>
  );
}

function useTabs(keys: readonly TabKey[]) {
  const [active, setActive] = useState<TabKey>(keys[0] ?? 'new');
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const i = keys.indexOf(active);
    const next = e.key === 'ArrowRight' ? keys[(i + 1) % keys.length] : e.key === 'ArrowLeft' ? keys[(i - 1 + keys.length) % keys.length] : null;
    if (!next) return;
    e.preventDefault();
    setActive(next);
    document.getElementById(`tab-${next}`)?.focus();
  };
  return { active, setActive, onKeyDown };
}

type Action = 'commit' | 'discard';

/** Commit or discard; returns null on success or an error message. */
async function sendAction(id: string, kind: Action, merges: { fileName: string; existingEmployeeId: string }[]): Promise<string | null> {
  const commit = kind === 'commit';
  const res = await fetch(commit ? `/api/v1/imports/${id}/commit` : `/api/v1/imports/${id}`, {
    method: commit ? 'POST' : 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: commit ? JSON.stringify({ merges }) : undefined,
  }).catch(() => null);
  if (res?.ok) return null;
  const body = (await res?.json().catch(() => ({}))) as { error?: { message?: string } } | undefined;
  return body?.error?.message ?? 'Something went wrong. Please try again.';
}

function PreviewHeader({ p }: { p: ImportPreviewDto }) {
  const empty = p.emptySprints.length ? ` · ${p.emptySprints.join(', ')} empty, ignored` : '';
  const status = p.status === 'PREVIEW' ? `Preview expires ${formatDateTime(p.expiresAt)}` : `Status: ${p.status.toLowerCase().replace('_', ' ')}`;
  return (
    <header className="space-y-1">
      <h1 className="text-xl font-bold text-navy">Review import</h1>
      <p className="text-sm text-muted">
        {p.fileName} · sheet “{p.sheetName}” · header row {p.headerRow} · sprints {p.sprints[0]}–{p.sprints.at(-1)} ({p.sprints.length}){empty}
      </p>
      <p className="text-xs text-muted">{status}</p>
      {p.sameAsBatch ? <Alert tone="info">This file was already imported on {formatDateTime(p.sameAsBatch.committedAt)}.</Alert> : null}
      {p.status === 'EXPIRED' ? <Alert tone="warning" title="This preview expired">Upload the file again to review current changes.</Alert> : null}
    </header>
  );
}

function NearDuplicates({ p, merges, onToggle }: { p: ImportPreviewDto; merges: Record<string, boolean>; onToggle: (key: string, on: boolean) => void }) {
  if (!p.nearDuplicates.length || p.status !== 'PREVIEW') return null;
  return (
    <section aria-labelledby="nd-title" className="rounded-xl border border-warning-border bg-warning-bg p-4 text-sm text-warning-text">
      <h2 id="nd-title" className="font-semibold">Possible duplicates — tick if it is the same person</h2>
      <ul className="mt-2 space-y-1">
        {p.nearDuplicates.map((n) => {
          const key = `${n.fileName}|${n.existingEmployeeId}`;
          return (
            <li key={key}>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={Boolean(merges[key])} onChange={(e) => onToggle(key, e.target.checked)} />
                <span>“{n.fileName}” is existing “{n.existingName}”</span>
                {merges[key] ? null : <span className="text-xs">(will be created as new)</span>}
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Actions({ p, errors, busy, onAct }: { p: ImportPreviewDto; errors: number; busy: Action | null; onAct: (a: Action) => void }) {
  if (p.status !== 'PREVIEW') return null;
  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      {errors ? <p className="text-sm text-band-ni">Fix the {errors} error(s) in the sheet and upload it again.</p> : null}
      <Button variant="secondary" loading={busy === 'discard'} disabled={busy !== null} onClick={() => onAct('discard')}>Discard</Button>
      <Button loading={busy === 'commit'} disabled={!p.canCommit || busy !== null} onClick={() => onAct('commit')}>Confirm import</Button>
    </div>
  );
}

/** Review-before-commit screen (US-02-03 / US-02-05). */
export function ImportPreview({ preview }: Readonly<{ preview: ImportPreviewDto }>) {
  const router = useRouter();
  const panelId = useId();
  const p = preview;
  const errors = p.issues.filter((i) => i.severity === 'error');
  const warnings = p.issues.filter((i) => i.severity === 'warning');
  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'new', label: 'New employees', count: p.newEmployees.length },
    { key: 'changes', label: 'Changes', count: p.attributeChanges.length + p.newTeams.length + p.newDesignations.length + p.notInFile.length },
    { key: 'scores', label: 'Scores', count: p.scoreChanges.length },
    { key: 'warnings', label: 'Warnings', count: warnings.length },
    { key: 'errors', label: 'Errors', count: errors.length },
  ];
  const { active, setActive, onKeyDown } = useTabs(tabs.map((t) => t.key));
  const [merges, setMerges] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<Action | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  async function act(kind: Action) {
    setBusy(kind);
    setProblem(null);
    const chosen = p.nearDuplicates.filter((n) => merges[`${n.fileName}|${n.existingEmployeeId}`]).map((n) => ({ fileName: n.fileName, existingEmployeeId: n.existingEmployeeId }));
    const message = await sendAction(p.id, kind, chosen);
    setBusy(null);
    if (message) {
      setProblem(message);
      return;
    }
    router.push(kind === 'commit' ? `/dashboard?imported=${p.id}` : '/imports');
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <PreviewHeader p={p} />
      {problem ? <Alert tone="error" title="Import not applied">{problem}</Alert> : null}

      <section aria-label="Summary" className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        <Stat label="Rows" value={p.summary.rows} />
        <Stat label="New employees" value={p.summary.newEmployees} />
        <Stat label="Matched" value={p.summary.matchedEmployees} />
        <Stat label="Team/desig. changes" value={p.summary.attributeChanges} />
        <Stat label="New sprints" value={p.summary.newSprints} />
        <Stat label="Scores added" value={p.summary.scoresAdded} />
        <Stat label="Scores changed" value={p.summary.scoresChanged} />
        <Stat label="Unchanged" value={p.summary.scoresUnchanged} />
        <Stat label="Not in file" value={p.summary.notInFile} />
        <Stat label="Errors" value={p.summary.errors} tone={p.summary.errors ? 'text-band-ni' : ''} />
        <Stat label="Warnings" value={p.summary.warnings} />
      </section>

      <NearDuplicates p={p} merges={merges} onToggle={(key, on) => setMerges((m) => ({ ...m, [key]: on }))} />

      <section className="rounded-xl border border-line bg-surface p-4">
        <div role="tablist" aria-label="Import details" className="flex gap-1 overflow-x-auto border-b border-line">
          {tabs.map((t) => (
            <button
              key={t.key}
              id={`tab-${t.key}`}
              role="tab"
              type="button"
              aria-selected={active === t.key}
              aria-controls={panelId}
              tabIndex={active === t.key ? 0 : -1}
              onClick={() => setActive(t.key)}
              onKeyDown={onKeyDown}
              className={`whitespace-nowrap px-3 py-2 text-sm ${active === t.key ? 'border-b-2 border-teal font-bold text-navy' : 'text-muted hover:text-navy'}`}
            >
              {t.label} <span className="tabular">({t.count})</span>
            </button>
          ))}
        </div>
        <div id={panelId} role="tabpanel" aria-labelledby={`tab-${active}`} className="pt-3">
          {active === 'new' ? <NewTab p={p} /> : null}
          {active === 'changes' ? <ChangesTab p={p} /> : null}
          {active === 'scores' ? <ScoresTab p={p} /> : null}
          {active === 'warnings' ? <IssuesTab issues={warnings} empty="No warnings." /> : null}
          {active === 'errors' ? <IssuesTab issues={errors} empty="No errors." /> : null}
        </div>
      </section>

      <Actions p={p} errors={errors.length} busy={busy} onAct={(a) => void act(a)} />
    </div>
  );
}
