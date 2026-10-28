import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/app/_lib/dal';
import { safeRedirectPath } from '@/app/_lib/session-cookie';
import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const raw = (await searchParams).next;
  const next = safeRedirectPath(Array.isArray(raw) ? raw[0] : raw);
  if (await getSession()) redirect(next);

  return (
    <main id="main" className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        <div className="border-t-4 border-teal bg-navy px-6 py-5 text-white">
          <h1 className="text-lg font-bold">Cloudtech HRM</h1>
          <p className="text-xs text-[#a9bfc8]">Sign in to the KPI dashboard</p>
        </div>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
