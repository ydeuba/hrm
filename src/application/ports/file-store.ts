/** Binary storage for uploaded originals and backups, outside the web root (ADR-013). */
export interface FileStore {
  put(key: string, bytes: Uint8Array): Promise<void>;
  get(key: string): Promise<Uint8Array | null>;
  delete(key: string): Promise<void>;
}

export interface ContentHasher {
  /** Lower-case hex SHA-256 of the content. */
  sha256(bytes: Uint8Array): string;
}
