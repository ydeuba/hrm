'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

/** Signed-in user indicator with a server-side logout (US-01-02 AC-2). */
export function UserMenu({ email }: Readonly<{ email: string }>) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST' });
    } finally {
      router.replace('/login');
      router.refresh();
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/account" className="hidden max-w-48 truncate text-xs text-white/80 underline-offset-2 hover:underline lg:inline" title={`${email} — account settings`}>
        {email}
      </Link>
      <button
        type="button"
        onClick={logout}
        disabled={pending}
        className="rounded-md bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20 disabled:opacity-60"
      >
        Log out
      </button>
    </div>
  );
}
