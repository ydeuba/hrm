import 'server-only';
import type {
  AdminUserRecord,
  AdminUserRepository,
  LoginThrottleRepository,
  SessionRecord,
  SessionStore,
} from '@/application/ports/auth';
import type { ThrottleState } from '@/domain/auth/login-throttle';
import type { Db } from '../prisma';

const USER_FIELDS = { id: true, email: true, passwordHash: true } as const;

export class PrismaAdminUserRepository implements AdminUserRepository {
  constructor(private readonly db: Db) {}

  findByEmail(email: string): Promise<AdminUserRecord | null> {
    return this.db.adminUser.findUnique({ where: { email }, select: USER_FIELDS });
  }

  findById(id: string): Promise<AdminUserRecord | null> {
    return this.db.adminUser.findUnique({ where: { id }, select: USER_FIELDS });
  }

  create(email: string, passwordHash: string): Promise<AdminUserRecord> {
    return this.db.adminUser.create({ data: { email, passwordHash }, select: USER_FIELDS });
  }

  async updatePassword(id: string, passwordHash: string, changedAt: Date): Promise<void> {
    await this.db.adminUser.update({ where: { id }, data: { passwordHash, passwordChangedAt: changedAt }, select: { id: true } });
  }

  async recordLogin(id: string, at: Date): Promise<void> {
    await this.db.adminUser.update({ where: { id }, data: { lastLoginAt: at }, select: { id: true } });
  }
}

export class PrismaSessionStore implements SessionStore {
  constructor(private readonly db: Db) {}

  async create(input: { userId: string; tokenHash: string; createdAt: Date; expiresAt: Date; userAgent: string | null }): Promise<void> {
    await this.db.session.create({
      data: {
        userId: input.userId,
        tokenHash: input.tokenHash,
        createdAt: input.createdAt,
        lastSeenAt: input.createdAt,
        expiresAt: input.expiresAt,
        userAgent: input.userAgent?.slice(0, 300) ?? null,
      },
      select: { id: true },
    });
  }

  async find(tokenHash: string): Promise<SessionRecord | null> {
    const s = await this.db.session.findUnique({
      where: { tokenHash },
      select: { tokenHash: true, userId: true, lastSeenAt: true, expiresAt: true, user: { select: { email: true } } },
    });
    return s ? { tokenHash: s.tokenHash, userId: s.userId, email: s.user.email, lastSeenAt: s.lastSeenAt, expiresAt: s.expiresAt } : null;
  }

  async touch(tokenHash: string, at: Date): Promise<void> {
    await this.db.session.updateMany({ where: { tokenHash }, data: { lastSeenAt: at } });
  }

  async revoke(tokenHash: string): Promise<void> {
    await this.db.session.deleteMany({ where: { tokenHash } });
  }

  async revokeAllFor(userId: string, exceptTokenHash?: string): Promise<void> {
    await this.db.session.deleteMany({
      where: { userId, ...(exceptTokenHash ? { tokenHash: { not: exceptTokenHash } } : {}) },
    });
  }
}

export class PrismaLoginThrottleRepository implements LoginThrottleRepository {
  constructor(private readonly db: Db) {}

  get(email: string): Promise<ThrottleState | null> {
    return this.db.loginThrottle.findUnique({
      where: { email },
      select: { failures: true, windowStart: true, lockedUntil: true },
    });
  }

  async save(email: string, state: ThrottleState): Promise<void> {
    await this.db.loginThrottle.upsert({
      where: { email },
      create: { email, ...state },
      update: { ...state },
      select: { email: true },
    });
  }

  async reset(email: string): Promise<void> {
    await this.db.loginThrottle.deleteMany({ where: { email } });
  }
}
