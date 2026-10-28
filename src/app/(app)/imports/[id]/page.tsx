import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ImportPreview } from '@/components/import/import-preview';
import { getContainer } from '@/infrastructure/container';

export const metadata: Metadata = { title: 'Review import' };

export default async function ImportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { useCases } = await getContainer();
  const result = await useCases.getImport.execute(id);
  if (!result.ok) notFound();
  return <ImportPreview preview={result.value} />;
}
