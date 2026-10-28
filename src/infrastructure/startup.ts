import { loadEnv } from './env';

/**
 * Validate configuration at server start and terminate on failure so a
 * misconfigured deployment never serves requests (E-00-04 AC-1). Node runtime only.
 */
export function validateEnvOrExit(source: Readonly<Record<string, string | undefined>> = process.env): void {
  try {
    loadEnv(source);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
