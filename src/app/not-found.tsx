import Link from 'next/link';

export default function NotFound() {
  return (
    <main id="main" className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-navy">Page not found</h1>
      <p className="mt-2 text-sm text-muted">This page doesn’t exist or isn’t available yet.</p>
      <Link href="/dashboard" className="mt-6 inline-block rounded-md bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-strong">
        Back to dashboard
      </Link>
    </main>
  );
}
