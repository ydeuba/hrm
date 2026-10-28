import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AppraisalSummary } from '@/components/print/appraisal-summary';
import { AutoPrint } from '@/components/print/auto-print';
import { getContainer } from '@/infrastructure/container';

export const metadata: Metadata = { title: 'Team appraisals — print' };

/** /print/teams/[id] — every active engineer's summary, one per page (US-07-05). */
export default async function PrintTeamPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ autoprint?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { useCases, clock } = await getContainer();
  const result = await useCases.getTeamAppraisals.execute(id);
  if (!result.ok) notFound();
  const { team, profiles } = result.value;
  const generatedAt = clock.now().toISOString();
  if (profiles.length === 0) {
    return (
      <section className="appraisal-page">
        <h1 className="text-xl font-bold text-navy">{team.name}</h1>
        <p className="mt-2 text-sm text-muted">No engineers in this team.</p>
      </section>
    );
  }
  return (
    <>
      <AutoPrint enabled={sp.autoprint !== '0'} />
      <h1 className="sr-only">{team.name} — appraisal summaries ({profiles.length})</h1>
      {profiles.map((p) => <AppraisalSummary key={p.employee.id} p={p} generatedAt={generatedAt} />)}
    </>
  );
}
