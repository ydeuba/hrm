---
story_id: E-00-02
epic_id: E-00
sprint: SPRINT-001
status: done
story_points: 5
completed_at: 2026-10-15T11:55:05.503Z
---

# E-00-02: Project scaffold & quality gates

| Field | Value |
|---|---|
| Epic | E-00 — Platform Foundation |
| Sprint | SPRINT-001 |
| Status | **done** |
| Story points | 5 |

## User Story

**As a** developer
**I want** a scaffolded Next.js app with strict TypeScript, Tailwind, ESLint boundaries, Vitest and Playwright
**so that** every later story ships against enforced quality gates

## Acceptance Criteria

- [x] AC-1: Given a clean clone, when I run `npm ci && npm run verify`, then typecheck, lint, unit tests and build all pass.
- [x] AC-2: Given a file in `src/domain` that imports from `src/infrastructure` or `next/*`, when lint runs, then it fails with a boundaries error.
- [x] AC-3: Given a function with cyclomatic complexity 11, when lint runs, then it fails.
- [x] AC-4: The folder structure matches the architecture's "Folder structure" section; `data/` and `.env*` are git-ignored; `.env.example` documents every environment variable.

## Dates

- Created:      2026-10-15 11:45 UTC
- Last updated: 2026-10-15 11:55 UTC
- Completed:    2026-10-15 11:55 UTC
