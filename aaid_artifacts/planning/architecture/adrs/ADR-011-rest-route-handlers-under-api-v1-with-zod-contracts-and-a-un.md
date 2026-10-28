# ADR-011: REST Route Handlers under `/api/v1` with Zod contracts and a uniform error envelope

_Source of truth: [architecture.md](../architecture.md) — extracted 2026-10-15._

- **Status**: Accepted
- **Context**: Client mutations, file transfer and future integrations or tests need a stable, validated contract (NFR-11).
- **Decision**: Every handler is a thin adapter: `requireSession()` → Zod-parse params/body → call the use case → map the `Result` to HTTP. Shared Zod schemas live in `src/application/contracts/*` and are imported by both client and server. Errors use `{ error: { code: string; message: string; details?: unknown } }` with stable codes (`UNAUTHENTICATED`, `VALIDATION_FAILED`, `NOT_FOUND`, `CONFLICT_STALE_PREVIEW`, `IMPORT_INVALID_FILE`, `LOCKED_OUT`, …). Use cases return `Result<T, DomainError>`; only infrastructure faults throw, and those map to 500 with a correlation ID that is logged.
- **Consequences**: A predictable API that is easy to test with integration tests. There is a small amount of handler boilerplate, kept down by a `withHandler()` wrapper.
