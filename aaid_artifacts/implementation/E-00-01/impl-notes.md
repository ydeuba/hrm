# E-00-01 — Toolchain verification spike · Implementation record

**Type:** spike, done in a throwaway scratch project (no project source changed) · **Date:** 2026-10-15 · **Platform:** Windows 11, Node v24.22.0, npm with `allowScripts` enforcement

## Pinned versions (use exactly these in E-00-02)

| Package | Version | Note |
|---|---|---|
| next | 16.4.1 | Next 16 → request gate file is `proxy.ts` |
| react / react-dom | 19.3.1 | |
| typescript | **6.0.3** | **Not 7.x.** TS 7 (native) exposes only an `unstable/*` API, while Next's type-check and typescript-eslint (`<6.1.0`) need the classic API |
| prisma (dev) / @prisma/client | **7.10.0** | npm `latest` tag points to 8.0.0-rc.23; pin the stable 7.10.0 |
| @prisma/adapter-better-sqlite3 | 7.10.0 | + `better-sqlite3@^12` (12.11.1 has a prebuilt binary for win32/Node 24) |
| @prisma/adapter-libsql | 7.10.0 | fallback, verified working |
| xlsx (SheetJS) | 0.20.3 via `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` | npm 0.18.5 has known vulnerabilities (ADR-008) |
| @node-rs/argon2 | 2.2.2 | prebuilt binary, no node-gyp |
| tailwindcss 4.3.3 · vitest 5.0.4 · @playwright/test 1.64.1 · zod 4.6.7 · chart.js 4.5.1 · react-chartjs-2 5.3.1 · eslint 10.12.0 · typescript-eslint 8.71.2 · archiver 8.0.0 · pino 10.4.0 | | latest stable on 2026-10-15 |

## Findings

1. **npm blocks install scripts by default.** Native and engine packages must be approved: `npm install-scripts approve better-sqlite3 prisma @prisma/engines esbuild`. Without this, `better-sqlite3` has no `.node` binary.
2. **The Prisma 7 CLI pulls in vulnerable transitive packages** (`deepmerge-ts <8` and `mysql2 <=3.23.0`, both high severity). Fixed with `package.json` `overrides`: `"deepmerge-ts": "^8.0.2", "mysql2": "^3.24.6"`. After the override, `npm audit` → **0 vulnerabilities**, and migrate, generate and queries all still work.
3. **How Prisma 7 works now:**
   - It uses `prisma.config.ts` (with the datasource `url` there, not in the schema).
   - The generator is `prisma-client` with an explicit `output`.
   - `migrate dev` does **not** generate the client; run `prisma generate` explicitly.
   - The client is constructed with an `adapter`.
4. **Database features confirmed:**
   - SQLite `Json` and `enum` both work.
   - `PRAGMA journal_mode=WAL` → `wal`.
   - `foreign_keys` → `1`.
   - Interactive `$transaction` works with both adapters.
5. **argon2id** with OWASP parameters (m=19456, t=2, p=1) hashes and verifies correctly.
6. **SheetJS 0.20.3** reads the sample workbook and finds the sheet `"Compile Sheet "` (with a trailing space) by trimmed match.

## Acceptance criteria status

- [x] AC-1: satisfied — SheetJS 0.20.3 installed from cdn.sheetjs.com; `npm audit` reports 0 issues once the Prisma transitive overrides are applied; the sample workbook was read.
- [x] AC-2: satisfied — Prisma 7.10.0 + better-sqlite3 adapter: migration and queries succeed on Node 24 win32; the libSQL fallback also works.
- [x] AC-3: satisfied — `@node-rs/argon2` hashes and verifies on win32 with no node-gyp.
- [x] AC-4: satisfied — versions recorded above and in `.aaid/memory.md`.
