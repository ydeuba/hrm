import 'server-only';
import pino, { type Logger } from 'pino';

export type { Logger };

/**
 * Structured JSON logger (cross-cutting concerns). Request bodies, passwords,
 * tokens and score payloads must never be passed to it; the redact list is a
 * second line of defence for common sensitive keys.
 */
export function createLogger(level: string): Logger {
  return pino({
    level,
    base: { app: 'hrm' },
    redact: {
      paths: ['password', 'newPassword', 'currentPassword', 'token', 'cookie', '*.password', '*.token', 'req.headers.cookie'],
      censor: '[redacted]',
    },
  });
}
