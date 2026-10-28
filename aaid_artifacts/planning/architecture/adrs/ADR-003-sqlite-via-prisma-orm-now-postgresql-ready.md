# ADR-003: SQLite via Prisma ORM now, PostgreSQL-ready

_Source of truth: [architecture.md](../architecture.md) — extracted 2026-10-15._

- **Status**: Accepted
- **Context**: v1 runs locally, and the user will deploy it to a server later (OQ-10). It needs zero-setup storage, transactions for atomic imports (NFR-17) and painless migration (NFR-06).
- **Decision**: Prisma **≥ 6.2** (needed for `Json` and `enum` on SQLite; prefer the current major) with the SQLite provider, file `./data/hrm.db`, connected through the **current Prisma major's recommended SQLite driver adapter** (for example `@prisma/adapter-better-sqlite3` on Prisma 7). At scaffold time, verify that a prebuilt native binary exists for Node 24 on win32; the fallback is `@prisma/adapter-libsql` with a `file:` URL. Use only features both providers support: no raw SQL in repositories except the SQLite backup command, which is isolated behind `BackupProvider`. Enable WAL mode and `foreign_keys=ON` at startup. Migrations live in `prisma/migrations`. Rejected alternatives: Drizzle (fine, but Prisma's schema and migrations are simpler for a single developer, and the switch to PostgreSQL is a `provider` change plus a fresh baseline migration) and a JSON file store (no transactions or querying).
- **Consequences**: Zero-install database and easy backup (copy the file). SQLite has a single writer, which is fine for 1–3 users. Moving to PostgreSQL needs a new migration baseline and a data copy script (documented in the README). Decimal behaviour differs between providers, which ADR-004 avoids.
