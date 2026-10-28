'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Button } from './button';

/** Modal confirmation for destructive actions (design.md "Destructive actions"). */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: Readonly<{ open: boolean; title: string; children: ReactNode; confirmLabel: string; danger?: boolean; busy?: boolean; onConfirm: () => void; onCancel: () => void }>) {
  const ref = useRef<HTMLDialogElement>(null);
  // Unique per instance: several dialogs can share a page.
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} aria-labelledby={titleId} onClose={onCancel} className="m-auto w-full max-w-md rounded-xl p-0 backdrop:bg-navy/55">
      <div className="space-y-3 p-5">
        <h2 id={titleId} className="text-lg font-bold text-navy">{title}</h2>
        <div className="text-sm text-ink">{children}</div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} loading={busy} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </dialog>
  );
}
