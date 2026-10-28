'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { EmployeeDto } from '@/application/use-cases/employees/employee-use-cases';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface Option {
  readonly id: string;
  readonly name: string;
}

const field = 'w-full rounded-md border border-line bg-surface px-3 py-2 text-sm';
const label = 'mb-1 block text-xs font-bold uppercase tracking-wide text-muted';

async function send(url: string, body: unknown): Promise<string | null> {
  const res = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null);
  if (res?.ok) return null;
  const b = (await res?.json().catch(() => ({}))) as { error?: { message?: string } } | undefined;
  return b?.error?.message ?? 'Saving failed.';
}

/** Collect only changed fields so the audit records exactly what HR edited. */
function changes(e: EmployeeDto, data: FormData): Record<string, string> {
  const current: Record<string, string> = {
    displayName: e.displayName, teamId: e.team.id, designationId: e.designation.id, employeeCode: e.employeeCode ?? '',
    email: e.email ?? '', joiningDate: e.joiningDate ?? '', status: e.status,
  };
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(current)) {
    const next = String(data.get(k) ?? '').trim();
    if (next !== v) out[k] = next;
  }
  return out;
}

/** Edit drawer (US-03-02): fields, lock indicators with unlock, alias chips. */
export function EmployeeEditor({ employee, teams, designations }: Readonly<{ employee: EmployeeDto; teams: readonly Option[]; designations: readonly Option[] }>) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const e = employee;

  useEffect(() => {
    const d = ref.current;
    if (open && d && !d.open) d.showModal();
    if (!open && d?.open) d.close();
  }, [open]);

  async function save(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const patch = changes(e, new FormData(ev.currentTarget));
    if (Object.keys(patch).length === 0) {
      setOpen(false);
      return;
    }
    setBusy(true);
    const message = await send(`/api/v1/employees/${e.id}`, patch);
    setBusy(false);
    setError(message);
    if (!message) {
      setOpen(false);
      router.refresh();
    }
  }

  async function unlockField(fieldName: 'teamLocked' | 'designationLocked') {
    const message = await send(`/api/v1/employees/${e.id}/locks`, { [fieldName]: false });
    setError(message);
    if (!message) router.refresh();
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={`Edit ${e.displayName}`} className="rounded px-2 py-1 text-xs font-semibold text-teal hover:bg-ltbg">
        Edit
      </button>
      <dialog ref={ref} aria-labelledby={`edit-${e.id}`} onClose={() => setOpen(false)} className="ml-auto mr-0 h-full max-h-none w-full max-w-[480px] p-0 backdrop:bg-navy/55">
        <form onSubmit={save} className="flex h-full flex-col gap-4 overflow-auto p-5">
          <div className="flex items-start justify-between">
            <h2 id={`edit-${e.id}`} className="text-lg font-bold text-navy">Edit {e.displayName}</h2>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="h-8 w-8 rounded-full bg-ltbg text-lg">×</button>
          </div>
          <div>
            <label htmlFor={`n-${e.id}`} className={label}>Display name</label>
            <input id={`n-${e.id}`} name="displayName" defaultValue={e.displayName} required maxLength={120} className={field} />
            {e.aliases.length ? <p className="mt-1 text-xs text-muted">Also matched as: {e.aliases.join(', ')}</p> : null}
          </div>
          <div>
            <label htmlFor={`t-${e.id}`} className={label}>Team {e.teamLocked ? '🔒' : ''}</label>
            <select id={`t-${e.id}`} name="teamId" defaultValue={e.team.id} className={field}>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {e.teamLocked ? (
              <p className="mt-1 text-xs text-muted">
                Locked — imports won’t change it. <button type="button" onClick={() => void unlockField('teamLocked')} className="font-semibold text-teal underline">Unlock</button>
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor={`d-${e.id}`} className={label}>Designation {e.designationLocked ? '🔒' : ''}</label>
            <select id={`d-${e.id}`} name="designationId" defaultValue={e.designation.id} className={field}>
              {designations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            {e.designationLocked ? (
              <p className="mt-1 text-xs text-muted">
                Locked — imports won’t change it. <button type="button" onClick={() => void unlockField('designationLocked')} className="font-semibold text-teal underline">Unlock</button>
              </p>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`c-${e.id}`} className={label}>Employee code</label>
              <input id={`c-${e.id}`} name="employeeCode" defaultValue={e.employeeCode ?? ''} maxLength={40} className={field} />
            </div>
            <div>
              <label htmlFor={`j-${e.id}`} className={label}>Joining date</label>
              <input id={`j-${e.id}`} name="joiningDate" type="date" defaultValue={e.joiningDate ?? ''} className={field} />
            </div>
          </div>
          <div>
            <label htmlFor={`e-${e.id}`} className={label}>Email</label>
            <input id={`e-${e.id}`} name="email" type="email" defaultValue={e.email ?? ''} maxLength={254} className={field} />
          </div>
          <div>
            <label htmlFor={`s-${e.id}`} className={label}>Status</label>
            <select id={`s-${e.id}`} name="status" defaultValue={e.status} className={field}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive (hidden from the dashboard by default)</option>
            </select>
          </div>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <div className="mt-auto flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={busy}>Save</Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
