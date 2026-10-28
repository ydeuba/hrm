'use client';

import { useEffect } from 'react';

/** Delay before opening the print dialog so charts have rendered at print size. */
const PRINT_DELAY_MS = 800;

/** Opens the print dialog once after mount (unless disabled) and offers a manual button on screen. */
export function AutoPrint({ enabled }: Readonly<{ enabled: boolean }>) {
  useEffect(() => {
    if (!enabled) return undefined;
    const timer = window.setTimeout(() => window.print(), PRINT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [enabled]);
  return (
    <button type="button" onClick={() => window.print()} className="mb-3 min-h-10 rounded-md bg-teal px-4 py-2 text-sm font-semibold text-white print:hidden">
      Print / Save as PDF
    </button>
  );
}
