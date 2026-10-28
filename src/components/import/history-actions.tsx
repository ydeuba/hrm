'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

/** Per-batch history actions: original download and (latest only) rollback (US-02-06/09). */
export function HistoryActions({
  id,
  fileName,
  hasOriginal,
  removedReason,
  canRollback,
}: Readonly<{ id: string; fileName: string; hasOriginal: boolean; removedReason: string | null; canRollback: boolean }>) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function rollback() {
    setBusy(true);
    const res = await fetch(`/api/v1/imports/${id}/rollback`, { method: 'POST' }).catch(() => null);
    setBusy(false);
    setConfirming(false);
    if (res?.ok) {
      router.refresh();
      return;
    }
    const body = (await res?.json().catch(() => ({}))) as { error?: { message?: string } } | undefined;
    setError(body?.error?.message ?? 'Roll back failed.');
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {hasOriginal ? (
        <a href={`/api/v1/imports/${id}/file`} className="text-xs font-semibold text-teal underline-offset-2 hover:underline" download>
          Download original
        </a>
      ) : (
        <span className="text-xs text-muted" aria-disabled="true">
          <span className="line-through">Download original</span> — {removedReason ?? 'Original no longer stored'}
        </span>
      )}
      {canRollback ? (
        <button type="button" onClick={() => setConfirming(true)} className="rounded-md border border-band-ni/40 px-2 py-1 text-xs font-semibold text-band-ni hover:bg-band-ni/10">
          Roll back
        </button>
      ) : null}
      {error ? <Alert tone="error">{error}</Alert> : null}
      <ConfirmDialog
        open={confirming}
        title="Roll back this import?"
        confirmLabel="Roll back"
        danger
        busy={busy}
        onConfirm={() => void rollback()}
        onCancel={() => setConfirming(false)}
      >
        Every employee, sprint and score change made by <b>{fileName}</b> will be reverted. The dashboard returns to the state before this import.
      </ConfirmDialog>
    </div>
  );
}
