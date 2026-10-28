import type { ReactNode } from 'react';
import { requireSession } from '@/app/_lib/dal';

/** Print layouts (ADR-012): authenticated, but without the app shell, navigation or filters. */
export default async function PrintLayout({ children }: Readonly<{ children: ReactNode }>) {
  await requireSession();
  return <main className="print-root mx-auto max-w-[1100px] bg-white p-4 text-ink">{children}</main>;
}
