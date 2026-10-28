/**
 * Create the first HR Admin from ADMIN_EMAIL / ADMIN_PASSWORD (US-01-03).
 * Usage: npm run seed:admin   — remove the variables from .env afterwards.
 */
import 'dotenv/config';
import { createContainer } from '../src/infrastructure/container';
import { getEnv } from '../src/infrastructure/env';

const MESSAGES: Record<string, string> = {
  MISSING_EMAIL: 'ADMIN_EMAIL is not set.',
  INVALID_EMAIL: 'ADMIN_EMAIL is not a valid email address.',
  MISSING_PASSWORD: 'ADMIN_PASSWORD is not set.',
  WEAK_PASSWORD: 'ADMIN_PASSWORD must be at least 12 characters.',
};

async function main(): Promise<number> {
  const container = await createContainer(getEnv());
  try {
    const result = await container.useCases.createInitialAdmin.execute({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    });
    if (!result.ok) {
      console.error(`Cannot create admin: ${MESSAGES[result.error] ?? result.error}`);
      return 1;
    }
    console.log(
      result.value.status === 'created'
        ? `HR Admin ${result.value.email} created. Remove ADMIN_PASSWORD from your environment now.`
        : `HR Admin ${result.value.email} already exists — nothing changed.`,
    );
    return 0;
  } finally {
    await container.close();
  }
}

main()
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    console.error('seed:admin failed:', error);
    process.exit(1);
  });
