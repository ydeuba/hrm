import { z } from 'zod';

const intInRange = (min: number, max: number, fallback: number) =>
  z.coerce.number().int().min(min).max(max).default(fallback);

const originList = z
  .string()
  .optional()
  .transform((raw) => (raw ?? '').split(',').map((s) => s.trim()).filter(Boolean))
  .pipe(z.array(z.url().transform((u) => new URL(u).origin)));

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1).startsWith('file:', { message: 'must be a SQLite file: URL, e.g. file:./data/hrm.db' }),
  DATA_DIR: z.string().min(1),
  SESSION_IDLE_MINUTES: intInRange(5, 1440, 60),
  SESSION_ABSOLUTE_HOURS: intInRange(1, 72, 12),
  UPLOAD_MAX_BYTES: intInRange(1024, 50 * 1024 * 1024, 5 * 1024 * 1024),
  UPLOAD_MAX_UNCOMPRESSED_BYTES: intInRange(1024, 500 * 1024 * 1024, 50 * 1024 * 1024),
  TRUSTED_ORIGINS: originList,
  APP_TIMEZONE: z.string().min(1).default('Asia/Kathmandu'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export type Env = z.infer<typeof EnvSchema>;

export class EnvError extends Error {
  readonly variables: readonly string[];

  constructor(issues: readonly { variable: string; message: string }[]) {
    super(`Invalid environment configuration:\n${issues.map((i) => `  - ${i.variable}: ${i.message}`).join('\n')}`);
    this.name = 'EnvError';
    this.variables = issues.map((i) => i.variable);
  }
}

/** Parse and validate environment variables; throws EnvError naming every bad variable. */
export function loadEnv(source: Readonly<Record<string, string | undefined>>): Env {
  const parsed = EnvSchema.safeParse(source);
  if (parsed.success) return parsed.data;
  throw new EnvError(
    parsed.error.issues.map((issue) => ({
      variable: String(issue.path[0] ?? 'unknown'),
      message: issue.message,
    })),
  );
}

let cached: Env | undefined;

/** Validated process environment, memoised for the process lifetime. */
export function getEnv(): Env {
  cached ??= loadEnv(process.env);
  return cached;
}
