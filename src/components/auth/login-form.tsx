'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

interface ApiError {
  error?: { code?: string; message?: string };
}

async function readError(res: Response): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as ApiError;
  if (res.status === 401) return 'Invalid email or password';
  return body.error?.message ?? 'Sign-in failed. Please try again.';
}

export function LoginForm({ next }: Readonly<{ next: string }>) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
      });
      if (!res.ok) {
        setError(await readError(res));
        return;
      }
      router.replace(next);
      router.refresh();
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 px-6 py-6" noValidate>
      <div>
        <label htmlFor="email" className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className="w-full rounded-md border border-line px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-md border border-line px-3 py-2 text-sm"
        />
      </div>
      {error ? (
        <p role="alert" className="rounded-md border border-band-ni/30 bg-band-ni/10 px-3 py-2 text-sm text-band-ni">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-strong disabled:opacity-60"
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
