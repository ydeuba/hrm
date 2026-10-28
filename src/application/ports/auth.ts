import type { ThrottleState } from '@/domain/auth/login-throttle';

export interface AdminUserRecord {
  readonly id: string;
  readonly email: string;
  readonly passwordHash: string;
}

export interface AdminUserRepository {
  findByEmail(email: string): Promise<AdminUserRecord | null>;
  findById(id: string): Promise<AdminUserRecord | null>;
  create(email: string, passwordHash: string): Promise<AdminUserRecord>;
  updatePassword(id: string, passwordHash: string, changedAt: Date): Promise<void>;
  recordLogin(id: string, at: Date): Promise<void>;
}

export interface SessionRecord {
  readonly tokenHash: string;
  readonly userId: string;
  readonly email: string;
  readonly lastSeenAt: Date;
  readonly expiresAt: Date;
}

export interface SessionStore {
  create(input: { userId: string; tokenHash: string; createdAt: Date; expiresAt: Date; userAgent: string | null }): Promise<void>;
  find(tokenHash: string): Promise<SessionRecord | null>;
  touch(tokenHash: string, at: Date): Promise<void>;
  revoke(tokenHash: string): Promise<void>;
  revokeAllFor(userId: string, exceptTokenHash?: string): Promise<void>;
}

export interface LoginThrottleRepository {
  get(email: string): Promise<ThrottleState | null>;
  save(email: string, state: ThrottleState): Promise<void>;
  reset(email: string): Promise<void>;
}

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(hash: string, password: string): Promise<boolean>;
}

export interface TokenService {
  /** New random session token and the hash that is stored server-side. */
  issue(): { token: string; tokenHash: string };
  hash(token: string): string;
}
