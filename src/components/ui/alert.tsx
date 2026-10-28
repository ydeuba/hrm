import type { ReactNode } from 'react';

type Tone = 'error' | 'warning' | 'info' | 'success';

const TONES: Record<Tone, string> = {
  error: 'border-band-ni/40 bg-band-ni/10 text-band-ni',
  warning: 'border-warning-border bg-warning-bg text-warning-text',
  info: 'border-teal/30 bg-ltbg text-navy',
  success: 'border-band-out/40 bg-band-out/10 text-band-out',
};

const ICONS: Record<Tone, string> = { error: '⛔', warning: '⚠', info: 'ℹ', success: '✓' };

/** Status message; errors are announced assertively, others politely. */
export function Alert({ tone, title, children, action }: { tone: Tone; title?: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex flex-wrap items-start gap-3 rounded-lg border border-l-4 px-4 py-3 text-sm ${TONES[tone]}`}>
      <span aria-hidden="true">{ICONS[tone]}</span>
      <div className="min-w-0 flex-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="mt-0.5">{children}</div> : null}
      </div>
      {action}
    </div>
  );
}
