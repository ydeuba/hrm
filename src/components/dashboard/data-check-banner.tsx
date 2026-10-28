'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { KpiDatasetDto } from '@/application/use-cases/kpi/get-dashboard-dataset';
import { fmt2 } from '@/components/format';

/** Surfaces sheet formula mismatches from the latest import (US-05-06 AC-1). Dismissible. */
export function DataCheckBanner({ dataCheck }: Readonly<{ dataCheck: KpiDatasetDto['dataCheck'] }>) {
  const [dismissed, setDismissed] = useState(false);
  if (!dataCheck || dismissed) return null;
  const n = dataCheck.items.length;
  return (
    <section role="region" aria-label="Data check" className="flex flex-wrap items-start gap-3 rounded-lg border border-l-4 border-warning-border bg-warning-bg px-4 py-3 text-xs text-warning-text">
      <div className="min-w-0 flex-1">
        <b>Data check:</b> {n} value{n === 1 ? '' : 's'} in the latest master sheet differ from the sprint scores —{' '}
        {dataCheck.items.slice(0, 3).map((i) => `${i.name} (${i.kind === 'AVG' ? 'average' : 'total'}: sheet ${fmt2(i.sheetValue)}, recalculated ${fmt2(i.computedValue)})`).join('; ')}
        {n > 3 ? `; and ${n - 3} more` : ''}. The dashboard uses the recalculated figures.{' '}
        <Link href={`/imports/${dataCheck.batchId}`} className="font-semibold underline">Details</Link>
      </div>
      <button type="button" onClick={() => setDismissed(true)} aria-label="Dismiss data check" className="rounded px-2 font-bold hover:bg-black/5">✕</button>
    </section>
  );
}
