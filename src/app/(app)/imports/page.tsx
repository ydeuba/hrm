import type { Metadata } from 'next';
import Link from 'next/link';
import { formatDateTime } from '@/components/format';
import { HistoryActions } from '@/components/import/history-actions';
import { UploadDropzone } from '@/components/import/upload-dropzone';
import { getContainer } from '@/infrastructure/container';

export const metadata: Metadata = { title: 'Imports' };

const STATUS_LABEL: Record<string, string> = {
  PREVIEW: 'Preview', COMMITTED: 'Committed', ROLLED_BACK: 'Rolled back', DISCARDED: 'Discarded', EXPIRED: 'Expired',
};

export default async function ImportsPage() {
  const { useCases, env } = await getContainer();
  const history = await useCases.listImports.execute({ limit: 30 });
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold text-navy">Imports</h1>
        <p className="text-sm text-muted">Upload the KPI master sheet, review what will change, then confirm.</p>
      </header>
      <section aria-labelledby="upload-title" className="rounded-xl border border-line bg-surface p-4">
        <h2 id="upload-title" className="mb-3 text-sm font-bold text-navy">Upload KPI master sheet</h2>
        <UploadDropzone maxMb={Math.round(env.UPLOAD_MAX_BYTES / 1048576)} />
      </section>
      <section aria-labelledby="history-title" className="rounded-xl border border-line bg-surface p-4">
        <h2 id="history-title" className="mb-3 text-sm font-bold text-navy">History</h2>
        {history.items.length === 0 ? (
          <p className="text-sm text-muted">No imports yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-navy text-xs uppercase tracking-wide text-white">
                  <th scope="col" className="px-3 py-2">Date</th>
                  <th scope="col" className="px-3 py-2">File</th>
                  <th scope="col" className="px-3 py-2">Sprints</th>
                  <th scope="col" className="px-3 py-2">Status</th>
                  <th scope="col" className="px-3 py-2">By</th>
                  <th scope="col" className="px-3 py-2 text-right">Scores +/~</th>
                  <th scope="col" className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.items.map((b) => (
                  <tr key={b.id} className="border-b border-line even:bg-zebra">
                    <td className="whitespace-nowrap px-3 py-2">{formatDateTime(b.committedAt ?? b.createdAt)}</td>
                    <td className="px-3 py-2">
                      <Link href={`/imports/${b.id}`} className="font-medium text-teal underline-offset-2 hover:underline">
                        {b.fileName}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">{b.sprints.from ? `${b.sprints.from}–${b.sprints.to}` : '—'}</td>
                    <td className="px-3 py-2">{STATUS_LABEL[b.status] ?? b.status}</td>
                    <td className="px-3 py-2">{b.actorEmail}</td>
                    <td className="tabular px-3 py-2 text-right">
                      +{b.summary.scoresAdded} / ~{b.summary.scoresChanged}
                    </td>
                    <td className="px-3 py-2">
                      <HistoryActions id={b.id} fileName={b.fileName} hasOriginal={b.hasOriginal} removedReason={b.originalRemovedReason} canRollback={b.canRollback} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
