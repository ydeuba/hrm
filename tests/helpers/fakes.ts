import type { AuditEntry, AuditLog } from '@/application/ports/audit-log';
import type {
  AdminUserRecord,
  AdminUserRepository,
  LoginThrottleRepository,
  PasswordHasher,
  SessionRecord,
  SessionStore,
  TokenService,
} from '@/application/ports/auth';
import type { Clock } from '@/application/ports/clock';
import type { ThrottleState } from '@/domain/auth/login-throttle';

export class FakeClock implements Clock {
  constructor(private current = new Date('2026-10-19T03:00:00.000Z')) {}
  now(): Date {
    return new Date(this.current.getTime());
  }
  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}

export class RecordingAudit implements AuditLog {
  readonly entries: AuditEntry[] = [];
  async record(entry: AuditEntry): Promise<void> {
    this.entries.push(entry);
  }
  actions(): string[] {
    return this.entries.map((e) => e.action);
  }
}

/** Deterministic, fast hasher for unit tests: "hashed:<password>". */
export class FakeHasher implements PasswordHasher {
  verifyCalls = 0;
  async hash(password: string): Promise<string> {
    return `hashed:${password}`;
  }
  async verify(hash: string, password: string): Promise<boolean> {
    this.verifyCalls++;
    return hash === `hashed:${password}`;
  }
}

export class FakeTokens implements TokenService {
  private n = 0;
  issue() {
    this.n++;
    const token = `token-${this.n}`;
    return { token, tokenHash: this.hash(token) };
  }
  hash(token: string): string {
    return `sha:${token}`;
  }
}

export class InMemoryUsers implements AdminUserRepository {
  readonly rows = new Map<string, AdminUserRecord & { lastLoginAt?: Date; passwordChangedAt?: Date }>();
  async findByEmail(email: string) {
    return [...this.rows.values()].find((u) => u.email === email) ?? null;
  }
  async findById(id: string) {
    return this.rows.get(id) ?? null;
  }
  async create(email: string, passwordHash: string) {
    const rec = { id: `u${this.rows.size + 1}`, email, passwordHash };
    this.rows.set(rec.id, rec);
    return rec;
  }
  async updatePassword(id: string, passwordHash: string, changedAt: Date) {
    const u = this.rows.get(id);
    if (u) this.rows.set(id, { ...u, passwordHash, passwordChangedAt: changedAt });
  }
  async recordLogin(id: string, at: Date) {
    const u = this.rows.get(id);
    if (u) this.rows.set(id, { ...u, lastLoginAt: at });
  }
}

export class InMemorySessions implements SessionStore {
  readonly rows = new Map<string, SessionRecord & { userAgent: string | null }>();
  constructor(private readonly users: InMemoryUsers) {}
  async create(input: { userId: string; tokenHash: string; createdAt: Date; expiresAt: Date; userAgent: string | null }) {
    const email = (await this.users.findById(input.userId))?.email ?? '';
    this.rows.set(input.tokenHash, {
      tokenHash: input.tokenHash,
      userId: input.userId,
      email,
      lastSeenAt: input.createdAt,
      expiresAt: input.expiresAt,
      userAgent: input.userAgent,
    });
  }
  async find(tokenHash: string) {
    return this.rows.get(tokenHash) ?? null;
  }
  async touch(tokenHash: string, at: Date) {
    const s = this.rows.get(tokenHash);
    if (s) this.rows.set(tokenHash, { ...s, lastSeenAt: at });
  }
  async revoke(tokenHash: string) {
    this.rows.delete(tokenHash);
  }
  async revokeAllFor(userId: string, except?: string) {
    for (const [k, s] of this.rows) if (s.userId === userId && k !== except) this.rows.delete(k);
  }
}

export class InMemoryThrottle implements LoginThrottleRepository {
  readonly rows = new Map<string, ThrottleState>();
  async get(email: string) {
    return this.rows.get(email) ?? null;
  }
  async save(email: string, state: ThrottleState) {
    this.rows.set(email, state);
  }
  async reset(email: string) {
    this.rows.delete(email);
  }
}
