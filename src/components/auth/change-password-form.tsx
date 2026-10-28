'use client';

import { useState, type FormEvent } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

const field = 'w-full rounded-md border border-line bg-surface px-3 py-2 text-sm';
const label = 'mb-1 block text-xs font-bold uppercase tracking-wide text-muted';

/** Change-password form (E-01-05). */
export function ChangePasswordForm() {
  const [state, setState] = useState<{ kind: 'idle' | 'saving' | 'done' } | { kind: 'error'; message: string }>({ kind: 'idle' });

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const next = String(data.get('newPassword') ?? '');
    if (next !== String(data.get('confirmPassword') ?? '')) {
      setState({ kind: 'error', message: 'The new passwords do not match.' });
      return;
    }
    setState({ kind: 'saving' });
    const res = await fetch('/api/v1/auth/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: data.get('currentPassword'), newPassword: next }),
    }).catch(() => null);
    if (res?.ok) {
      form.reset();
      setState({ kind: 'done' });
      return;
    }
    const body = (await res?.json().catch(() => ({}))) as { error?: { message?: string } } | undefined;
    setState({ kind: 'error', message: body?.error?.message ?? 'The password could not be changed.' });
  }

  return (
    <form onSubmit={onSubmit} className="max-w-md space-y-4 rounded-xl border border-line bg-surface p-5">
      <div>
        <label htmlFor="currentPassword" className={label}>Current password</label>
        <input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required className={field} />
      </div>
      <div>
        <label htmlFor="newPassword" className={label}>New password</label>
        <input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required minLength={12} aria-describedby="pw-help" className={field} />
        <p id="pw-help" className="mt-1 text-xs text-muted">At least 12 characters. Other signed-in sessions will be signed out.</p>
      </div>
      <div>
        <label htmlFor="confirmPassword" className={label}>Confirm new password</label>
        <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required className={field} />
      </div>
      {state.kind === 'error' ? <Alert tone="error">{state.message}</Alert> : null}
      {state.kind === 'done' ? <Alert tone="success">Password changed. Other sessions were signed out.</Alert> : null}
      <Button type="submit" loading={state.kind === 'saving'}>Change password</Button>
    </form>
  );
}
