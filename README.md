# hrm — Cloudtech HRM & Engineering KPI Dashboard

A single Next.js (TypeScript) application, with UI and backend in one project. HR uploads the KPI Master Sheet (`.xlsx`), and Management gets a validated, interactive KPI dashboard with rankings, profiles and exports.

- Requirements: [aaid_artifacts/planning/requirements/requirements.md](aaid_artifacts/planning/requirements/requirements.md)
- Architecture: [aaid_artifacts/planning/architecture/architecture.md](aaid_artifacts/planning/architecture/architecture.md)
- Backlog: [aaid_artifacts/planning/backlog/backlog.md](aaid_artifacts/planning/backlog/backlog.md)

## Getting started

Prerequisites: **Node.js 24+** and npm 11+ (Windows, macOS or Linux).

```bash
# 1. Install. This npm enforces install-script approval; native packages must be allowed once:
npm install-scripts approve better-sqlite3 prisma @prisma/engines esbuild unrs-resolver
npm ci

# 2. Configure
cp .env.example .env        # PowerShell: Copy-Item .env.example .env

# 3. Create the database and reference data
npm run db:migrate
npm run seed

# 4. Create the first HR Admin (set ADMIN_EMAIL / ADMIN_PASSWORD in .env first, then remove them)
npm run seed:admin

# 5. Run
npm run dev                 # http://localhost:3000
# To open it from other machines (http://<this-PC-IP>:3000), list that address in
# TRUSTED_ORIGINS in .env and restart; otherwise scripts and sign-in are refused there.
# or, for production:
npm run build && npm start
```

## Quality gates

| Command | What it checks |
|---|---|
| `npm run typecheck` | TypeScript strict mode |
| `npm run lint` | ESLint: layer boundaries (clean architecture), complexity ≤ 10, no `any` |
| `npm run test:coverage` | Vitest unit and integration tests; coverage ≥ 80% (100% for `src/domain`) |
| `npm run test:e2e` | Playwright end-to-end tests (`npx playwright install chromium` once) |
| `npm run verify` | typecheck + lint + coverage + production build |
| `npm run test:perf` | Performance benchmarks (below); not part of `verify` |

### Performance benchmarks (E-04-07)

Synthetic data, generated inside the tests. Thresholds come from NFR-01…04.

| Benchmark | Threshold | Measured (2026-10-16) |
|---|---|---|
| `computeDashboard`, 500 engineers × 200 sprints (every filter change in the browser) | p95 ≤ 100 ms | p95 40 ms (filtered 1 ms) |
| Import preview (parse, interpret, validate, diff, store), 200 rows × 200 sprints, 4.7 MB `.xlsx` | ≤ 5 s | 0.8 s |
| Dashboard dataset API, 500 × 200, uncached | p95 ≤ 500 ms, payload ≤ 0.7 MB | p95 184–350 ms, 0.55 MB |

Machine: Intel Core i7-13620H, 32 GB RAM, Windows 11, Node 24.22. The dataset figure varies between sessions on the same code (laptop power and thermal state), so it is given as the observed range. Re-run on the deployment server and record its numbers here.

## Exports, print and backup

- **Dashboard → Export Excel / Export CSV** downloads exactly the rows in view (current range and filters), with one column per sprint. Text beginning with `= + - @`, tab or CR is prefixed with `'` so spreadsheets never run it as a formula. CSV is UTF-8 with a BOM.
- **Dashboard → Print / PDF** opens `/print/dashboard` with the same filters and starts the print dialog. Each A4 page carries the filters, range and generated time, plus the footer "Cloudtech Services · Confidential".
- **Rankings → Export workbook** produces the sheets Overall, By designation and Last N sprints.
- **Settings → Download backup** produces `hrm-backup_<yyyymmdd-HHmm>.zip`, containing `hrm.db` (a consistent `VACUUM INTO` snapshot) and `uploads/`. It is audited as `BACKUP_CREATE`. The zip holds personal data, so store it securely.

### Restoring a backup

1. Stop the app.
2. Unzip the backup into `DATA_DIR` (default `./data`), replacing `hrm.db` and `uploads/`. Delete any leftover `hrm.db-wal` and `hrm.db-shm` files.
3. Run `npx prisma migrate deploy`. This brings an older snapshot up to the current schema; on a current one it does nothing.
4. Start the app (`npm start`).

`tests/integration/app/backup.test.ts` restores a fresh backup and checks that the row count of every table matches the source.

## Project layout (clean architecture — ADR-002)

```
src/domain          pure TypeScript business rules (KPI engine, import rules); no dependencies
src/application     use cases, ports (interfaces), Zod contracts
src/infrastructure  Prisma, SheetJS, argon2, file storage, composition root (container.ts)
src/app             Next.js pages, layouts, route handlers (presentation)
src/components      React components
prisma/             schema, migrations, seed
tests/              unit · integration · e2e · fixtures
data/               runtime database, uploads and backups (git-ignored)
```

## Toolchain notes

- **TypeScript is pinned to 6.0.x.** TypeScript 7 (native) doesn't yet expose the API that Next.js and typescript-eslint need.
- **Prisma is pinned to 7.10.0** (npm's `latest` tag points to an 8.0 release candidate). `package.json` `overrides` patch vulnerable packages that the Prisma CLI pulls in.
- **SheetJS is installed from `cdn.sheetjs.com`.** The npm-registry `xlsx@0.18.5` has known vulnerabilities.
