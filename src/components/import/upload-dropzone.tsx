'use client';

import { useRouter } from 'next/navigation';
import { useId, useRef, useState, type DragEvent } from 'react';
import { Alert } from '@/components/ui/alert';

type Phase = { kind: 'idle' } | { kind: 'uploading'; name: string } | { kind: 'error'; message: string };

/** Upload the KPI master sheet; on success navigate to its preview (US-02-05). */
export function UploadDropzone({ maxMb }: Readonly<{ maxMb: number }>) {
  const router = useRouter();
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [dragOver, setDragOver] = useState(false);
  const busy = phase.kind === 'uploading';

  async function send(file: File) {
    setPhase({ kind: 'uploading', name: file.name });
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch('/api/v1/imports', { method: 'POST', body: form });
      const body = (await res.json().catch(() => ({}))) as { id?: string; error?: { message?: string } };
      if (!res.ok || !body.id) {
        setPhase({ kind: 'error', message: body.error?.message ?? 'Upload failed. Please try again.' });
        return;
      }
      router.push(`/imports/${body.id}`);
    } catch {
      setPhase({ kind: 'error', message: 'Network error — check your connection and try again.' });
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && !busy) void send(file);
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center ${dragOver ? 'border-teal bg-ltbg' : 'border-line bg-surface'}`}
      >
        <span aria-hidden="true" className="text-2xl text-teal">⇪</span>
        <p className="text-sm text-ink">
          {busy ? `Uploading and validating “${phase.name}”…` : 'Drag the KPI master sheet here, or'}
        </p>
        <label htmlFor={inputId} className={`cursor-pointer rounded-md bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-strong ${busy ? 'pointer-events-none opacity-60' : ''}`}>
          Choose file
        </label>
        <input
          ref={input}
          id={inputId}
          type="file"
          accept=".xlsx,.csv"
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void send(file);
            e.target.value = '';
          }}
        />
        <p className="text-xs text-muted">.xlsx or .csv · max {maxMb} MB · “Compile Sheet” layout</p>
        {busy ? <div role="progressbar" aria-label="Uploading" className="mt-2 h-1 w-48 overflow-hidden rounded bg-ltbg"><div className="h-full w-1/2 animate-pulse bg-teal" /></div> : null}
      </div>
      {phase.kind === 'error' ? (
        <Alert tone="error" title="The file was not accepted">
          {phase.message}
        </Alert>
      ) : null}
    </div>
  );
}
