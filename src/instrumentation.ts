/**
 * Runs once when the Next.js server starts. The Node-only check is imported
 * inside the runtime guard so it is never bundled for the edge runtime.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnvOrExit } = await import('./infrastructure/startup');
    validateEnvOrExit();
  }
}
