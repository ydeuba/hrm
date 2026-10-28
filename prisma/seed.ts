import 'dotenv/config';
import { createPrismaClient } from '@/infrastructure/db/prisma';
import { seedReferenceData } from '@/infrastructure/db/seed-reference';

async function main(): Promise<void> {
  const db = await createPrismaClient(process.env.DATABASE_URL ?? 'file:./data/hrm.db');
  try {
    const summary = await seedReferenceData(db);
    console.log('Seed complete:', summary);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
