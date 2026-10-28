import type { ReactNode } from 'react';
import { requireSession } from '@/app/_lib/dal';
import { UserMenu } from '@/components/auth/user-menu';
import { AppShell } from '@/components/shell/app-shell';

/** Every page in this group requires a valid session (ADR-006 gate 2). */
export default async function AuthenticatedLayout({ children }: Readonly<{ children: ReactNode }>) {
  const session = await requireSession();
  return <AppShell userSlot={<UserMenu email={session.email} />}>{children}</AppShell>;
}
