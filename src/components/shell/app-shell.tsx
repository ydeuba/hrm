import Link from 'next/link';
import type { ReactNode } from 'react';
import { MainNav } from './main-nav';

/** Authenticated application chrome: navy header with teal top border (reference report styling). */
export function AppShell({ children, userSlot }: Readonly<{ children: ReactNode; userSlot?: ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-navy"
      >
        Skip to content
      </a>
      <header className="border-t-4 border-teal bg-navy text-white print:hidden">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <Link href="/dashboard" className="text-lg font-bold leading-tight">
              Cloudtech HRM
            </Link>
            <p className="text-xs text-[#a9bfc8]">Engineering KPI Dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            <MainNav />
            {userSlot}
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-[1180px] flex-1 px-4 py-5 sm:px-6">
        {children}
      </main>
      <footer className="mx-auto w-full max-w-[1180px] px-4 pb-8 pt-2 text-xs text-muted sm:px-6">
        Cloudtech Services · Confidential
      </footer>
    </div>
  );
}
