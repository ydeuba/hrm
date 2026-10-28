/**
 * Reset an HR Admin's password when it has been forgotten, and end their sessions.
 * Usage: npm run reset:admin -- <email>
 * Uses ADMIN_PASSWORD if it is set (min 12 chars); otherwise generates a random one
 * and prints it once. Change it in Settings after logging in.
 */
import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { Argon2PasswordHasher } from '../src/infrastructure/auth/argon2-password-hasher';
import { createPrismaClient } from '../src/infrastructure/db/prisma';
import { getEnv } from '../src/infrastructure/env';

async function main(): Promise<number> {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error('Usage: npm run reset:admin -- <email>');
    return 1;
  }
  const fromEnv = process.env.ADMIN_PASSWORD;
  if (fromEnv !== undefined && fromEnv !== '' && fromEnv.length < 12) {
    console.error('ADMIN_PASSWORD must be at least 12 characters.');
    return 1;
  }
  const password = fromEnv || randomBytes(12).toString('base64url');

  const db = await createPrismaClient(getEnv().DATABASE_URL);
  try {
    const user = await db.adminUser.findUnique({ where: { email } });
    if (!user) {
      console.error(`No HR Admin with email ${email}.`);
      return 1;
    }
    const passwordHash = await new Argon2PasswordHasher().hash(password);
    const [, ended] = await db.$transaction([
      db.adminUser.update({ where: { id: user.id }, data: { passwordHash, passwordChangedAt: new Date() } }),
      db.session.deleteMany({ where: { userId: user.id } }),
    ]);
    console.log(`Password for ${email} reset; ${ended.count} session(s) ended.`);
    if (!fromEnv) console.log(`New password: ${password}`);
    return 0;
  } finally {
    await db.$disconnect();
  }
}

main()
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    console.error('reset:admin failed:', error);
    process.exit(1);
  });
