import type { Metadata } from 'next';
import { ChangePasswordForm } from '@/components/auth/change-password-form';

export const metadata: Metadata = { title: 'Account' };

export default function AccountPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-navy">Account</h1>
      <ChangePasswordForm />
    </div>
  );
}
