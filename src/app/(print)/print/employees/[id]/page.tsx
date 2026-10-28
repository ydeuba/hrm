import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AppraisalSummary } from '@/components/print/appraisal-summary';
import { AutoPrint } from '@/components/print/auto-print';
import { getContainer } from '@/infrastructure/container';

export const metadata: Metadata = { title: 'Appraisal summary — print' };

/** /print/employees/[id] — one-page appraisal summary (US-07-04). */
export default async function PrintEmployeePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ autoprint?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { useCases, clock } = await getContainer();
  const result = await useCases.getEngineerProfile.execute({ id });
  if (!result.ok) notFound();
  return (
    <>
      <AutoPrint enabled={sp.autoprint !== '0'} />
      <AppraisalSummary p={result.value} generatedAt={clock.now().toISOString()} />
    </>
  );
}
