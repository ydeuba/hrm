'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import type { EngineerRow } from '@/domain/kpi/dashboard';
import type { SprintPoint } from '@/domain/kpi/groups';
import type { ScoreCell } from '@/domain/kpi/score-cell';
import type { SprintCode } from '@/domain/kpi/sprint-code';
import type { BandDef } from '@/domain/settings/kpi-settings';
import { EngineerTrendChart } from './engineer-trend-chart';
import { ProfileStats } from './profile-stats';

export interface ProfileData {
  readonly row: EngineerRow;
  readonly cells: readonly ScoreCell[];
  readonly rankOf: number;
  readonly designationRank: number | null;
  readonly designationSize: number;
}

/**
 * Engineer profile (US-06-01): stats, sprint trend (gaps for RUN/N/A) against
 * the org average. Native <dialog> provides the focus trap and Esc handling;
 * focus returns to the opening row on close.
 */
export function EngineerProfileModal({
  profile,
  sprints,
  orgTrend,
  bands,
  periods,
  onClose,
}: Readonly<{ profile: ProfileData | null; sprints: readonly SprintCode[]; orgTrend: readonly SprintPoint[]; bands: readonly BandDef[]; periods?: Readonly<Record<string, string>>; onClose: () => void }>) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (profile && !dialog.open) {
      opener.current = document.activeElement;
      dialog.showModal();
    } else if (!profile && dialog.open) {
      dialog.close();
    }
  }, [profile]);

  const close = () => {
    onClose();
    if (opener.current instanceof HTMLElement) opener.current.focus();
  };

  const p = profile;
  return (
    <dialog
      ref={ref}
      aria-labelledby="profile-title"
      onClose={close}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close();
      }}
      className="m-auto w-full max-w-[680px] rounded-xl p-0 backdrop:bg-navy/55 max-sm:h-full max-sm:max-h-none max-sm:max-w-none"
    >
      {p ? (
        <div className="max-h-[90vh] overflow-auto p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="profile-title" className="text-xl font-bold text-navy">{p.row.name}</h2>
              <p className="text-sm text-muted">
                {p.row.designation} · {p.row.team} · Overall rank {p.row.overallRank ?? '—'} of {p.rankOf}
                {p.designationRank ? ` · ${p.row.designation} rank ${p.designationRank} of ${p.designationSize}` : ''}
              </p>
            </div>
            <button type="button" onClick={() => ref.current?.close()} aria-label="Close" className="h-8 w-8 rounded-full bg-ltbg text-lg leading-none text-navy hover:brightness-95">
              ×
            </button>
          </div>
          <div className="mt-4">
            <ProfileStats m={p.row.metrics} bands={bands} />
          </div>
          <div className="mt-4">
            <EngineerTrendChart
              name={p.row.name}
              sprints={sprints}
              scores={p.cells.map((c) => (c.kind === 'scored' ? c.centi / 100 : null))}
              orgAverages={orgTrend.map((t) => t.average)}
              periods={periods}
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted">
            <span>
              Dashed line = org average per sprint. Gaps are sprints marked RUN or N/A
              {p.row.metrics.runSprints ? ` (${p.row.metrics.runSprints} RUN sprint${p.row.metrics.runSprints > 1 ? 's' : ''})` : ''}.
            </span>
            <Link href={`/employees/${p.row.id}`} className="text-sm font-semibold text-teal underline-offset-2 hover:underline">Open full profile</Link>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
