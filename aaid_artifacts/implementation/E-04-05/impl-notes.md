# E-04-05 — Dashboard dataset query & API · Implementation record

## Files
- `src/application/ports/kpi.ts`, `src/application/use-cases/kpi/get-dashboard-dataset.ts`: matrix, overall ranks (domain `rankAll` over active engineers), settings, data-check from the latest committed batch, last import; LRU memo (20 entries) keyed by `scoreRevision.settingsRevision` + query.
- `src/infrastructure/db/repositories/prisma-kpi-read-repository.ts`: employees and sprints via Prisma; the score matrix via the fast path below, with a portable `$queryRaw` fallback.
- `src/infrastructure/db/sqlite-score-reader.ts`: a lazy, read-only better-sqlite3 connection in raw-array mode; a full scan when the range covers every sprint.
- `GET /api/v1/kpi/dataset?from&to&includeInactive`: ETag = revisions + query → 304.
- `Container.close()` releases Prisma and the read-only connection (needed on Windows to delete temp DBs).
- Tests: `tests/integration/app/kpi-dataset.test.ts`, `tests/perf/dataset.perf.test.ts` (`npm run test:perf`).

## Performance work (AC-3)
| Variant | p50 | p95 |
|---|---|---|
| Prisma `findMany` (100k rows) | — | 722 ms |
| Prisma `$queryRaw` | — | 575 ms |
| + lightweight last-import lookup | 475 ms | 576 ms |
| better-sqlite3 raw, IN filter | 441 ms | 505 ms |
| better-sqlite3 raw, full scan when range = all sprints | **282 ms** | **313 ms** |

Payload: 0.55 MB uncompressed for 500 × 200. **ADR-003 deviation:** the fast path is SQLite-specific, read-only and isolated behind `KpiReadRepository` with a portable fallback.

## Acceptance criteria status
- [x] AC-1: satisfied — `KpiDatasetDto` with compact cells (`number | 'R' | null`), sprints in numeric order, server overall ranks (equal to the sheet for all 49) and the data-check summary.
- [x] AC-2: satisfied — matching `If-None-Match` → 304; a revision change → new ETag.
- [x] AC-3: satisfied — p95 313 ms and 0.55 MB for 500 × 200 (perf suite).
- [x] AC-4: satisfied — inactive employees are excluded by default and not ranked; `includeInactive=true` returns them with rank null.
