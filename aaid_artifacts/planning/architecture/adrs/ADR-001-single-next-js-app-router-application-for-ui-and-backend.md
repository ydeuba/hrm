# ADR-001: Single Next.js App Router application for UI and backend

_Source of truth: [architecture.md](../architecture.md) — extracted 2026-10-15._

- **Status**: Accepted
- **Context**: The user asked for the frontend and backend in one folder. There is one developer, no hosting budget, local-first use, and 1–3 users.
- **Decision**: One Next.js project using the App Router. Server Components render pages and call application use cases directly. Route Handlers under `/api/v1/*` serve client mutations, file upload/download and exports. Pin the **latest stable Next.js major at scaffold time** (16.x expected; 15.x acceptable) together with React 19 and Node 24 LTS. Rejected alternatives: a separate Express/NestJS API (two processes to deploy, duplicated types) and Server Actions for all mutations (multipart upload, file downloads and a testable REST contract are clearer as Route Handlers; Server Actions are allowed only for simple forms such as login and settings, if desired).
- **Consequences**: One deploy unit and shared TypeScript types end to end. The backend is tied to the Next.js runtime, but clean architecture (ADR-002) keeps business logic framework-free, so it can be extracted later. Long-running work is bounded (imports take under 5 s), so no job queue is needed.
