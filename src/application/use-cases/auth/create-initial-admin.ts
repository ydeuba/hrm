import { normaliseEmail } from '@/domain/auth/session-policy';
import { err, ok, type Result } from '@/domain/shared/result';
import type { AdminUserRepository, PasswordHasher } from '@/application/ports/auth';

export const MIN_PASSWORD_LENGTH = 12;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type CreateAdminError = 'MISSING_EMAIL' | 'INVALID_EMAIL' | 'MISSING_PASSWORD' | 'WEAK_PASSWORD';
export type CreateAdminOutcome = { readonly status: 'created' | 'exists'; readonly email: string };

/**
 * Create an HR Admin from installer-provided credentials (US-01-03).
 * Never overwrites an existing admin's password.
 */
export class CreateInitialAdmin {
  constructor(
    private readonly deps: { readonly users: AdminUserRepository; readonly hasher: PasswordHasher },
  ) {}

  async execute(input: { email?: string; password?: string }): Promise<Result<CreateAdminOutcome, CreateAdminError>> {
    const rawEmail = input.email?.trim() ?? '';
    if (!rawEmail) return err('MISSING_EMAIL');
    const email = normaliseEmail(rawEmail);
    if (!EMAIL_RE.test(email)) return err('INVALID_EMAIL');
    if (!input.password) return err('MISSING_PASSWORD');
    if (input.password.length < MIN_PASSWORD_LENGTH) return err('WEAK_PASSWORD');

    const existing = await this.deps.users.findByEmail(email);
    if (existing) return ok({ status: 'exists', email });
    await this.deps.users.create(email, await this.deps.hasher.hash(input.password));
    return ok({ status: 'created', email });
  }
}
