import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Cloudtech HRM · KPI Dashboard', template: '%s · Cloudtech HRM' },
  description: 'Engineering KPI dashboard and HR records for Cloudtech Services',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#10233f',
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  // Reading the request headers opts every page into dynamic rendering, which the
  // per-request CSP nonce requires (all pages are session-protected anyway).
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased" data-nonce-applied={nonce ? 'true' : 'false'}>
        {children}
      </body>
    </html>
  );
}
