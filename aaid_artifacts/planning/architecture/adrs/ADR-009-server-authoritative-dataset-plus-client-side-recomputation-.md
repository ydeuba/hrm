# ADR-009: Server-authoritative dataset plus client-side recomputation for filters

_Source of truth: [architecture.md](../architecture.md) — extracted 2026-10-15._

- **Status**: Accepted
- **Context**: Filter, sort and search changes must update cards, five charts and the table in ≤ 300 ms (NFR-02). The data is small (≤ 100k cells), and the overall rank must not change when the UI is filtered.
- **Decision**: The dashboard page (a Server Component) calls `GetDashboardDataset(range)`, which returns sprints, employees, the score matrix, settings, server-computed **overall ranks** and the data-check summary. This is passed as props to `DashboardClient`, which runs `computeDashboard(dataset, filters, settings)` from the shared domain in a `useMemo`. Changing the sprint range re-fetches from `/api/v1/kpi/dataset` (ETag = `scoreRevision.settingsRevision` + range). Rankings, profiles, exports and print views are computed **on the server** with the same functions. Cells are encoded compactly as `(number | 'R' | null)[]`: the score, `'R'` for RUN, or null for not scored.
- **Consequences**: Filtering is instant with no extra round trips, and the numbers are identical everywhere because there is one implementation. The payload is about 15 KB for 50 × 20 cells and about 0.6 MB uncompressed at the 500 × 200 ceiling (gzip about 120 KB). When the dataset exceeds 1 MB, the page renders the shell and the client fetches the dataset, so the RSC payload isn't duplicated in the HTML. If the scale target is exceeded, filtering moves to the server without changing the domain.
