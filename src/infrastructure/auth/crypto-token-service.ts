import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import type { TokenService } from '@/application/ports/auth';

/** 256-bit random session tokens; only their SHA-256 is persisted (ADR-005). */
export class CryptoTokenService implements TokenService {
  issue(): { token: string; tokenHash: string } {
    const token = randomBytes(32).toString('base64url');
    return { token, tokenHash: this.hash(token) };
  }

  hash(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }
}
