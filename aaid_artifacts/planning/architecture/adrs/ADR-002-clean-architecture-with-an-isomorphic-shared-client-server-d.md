# ADR-002: Clean Architecture with an isomorphic (shared client/server) domain layer

_Source of truth: [architecture.md](../architecture.md) — extracted 2026-10-15._

- **Status**: Accepted
- **Context**: `aaid.config.yaml` mandates clean architecture. KPI rules must give identical numbers in the dashboard, rankings, exports and print (BO-2: 100% accuracy). Filters must recompute in ≤ 300 ms (NFR-02).
- **Decision**: Four layers (`domain` → `application` → `infrastructure` / `presentation`) with dependencies pointing inward only. `src/domain` is pure TypeScript with zero runtime dependencies (no Node APIs, no Prisma, no React), so the browser can import the same `kpi` module for instant recomputation while the server uses it for authoritative rankings and exports. Boundaries are enforced by `eslint-plugin-boundaries` (or `dependency-cruiser`) rules that fail lint.
- **Consequences**: One implementation of every formula, and it can be tested in isolation (100% branch coverage target). It requires discipline: no `Date.now()`, `crypto` or I/O in the domain; these are injected via ports. The extra mapping between Prisma models and domain types is accepted.
