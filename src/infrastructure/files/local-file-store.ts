import 'server-only';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ContentHasher, FileStore } from '@/application/ports/file-store';

const SAFE_KEY = /^[a-z0-9][a-z0-9._-]*(\/[a-z0-9][a-z0-9._-]*)*$/i;

/** Files under DATA_DIR only; keys are validated so they can never escape it (ADR-013). */
export class LocalFileStore implements FileStore {
  private readonly root: string;

  constructor(dataDir: string) {
    this.root = path.resolve(dataDir);
  }

  private resolve(key: string): string {
    if (!SAFE_KEY.test(key) || key.includes('..')) throw new Error(`Unsafe storage key: ${key}`);
    const full = path.resolve(this.root, key);
    if (!full.startsWith(this.root + path.sep)) throw new Error(`Storage key escapes data dir: ${key}`);
    return full;
  }

  async put(key: string, bytes: Uint8Array): Promise<void> {
    const file = this.resolve(key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, bytes);
  }

  async get(key: string): Promise<Uint8Array | null> {
    try {
      return new Uint8Array(await readFile(this.resolve(key)));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolve(key), { force: true });
  }
}

export const sha256Hasher: ContentHasher = {
  sha256: (bytes) => createHash('sha256').update(bytes).digest('hex'),
};
