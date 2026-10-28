---
story_id: E-00-05
epic_id: E-00
sprint: SPRINT-001
status: done
story_points: 3
completed_at: 2026-10-15T14:56:39.520Z
---

# E-00-05: App shell, design tokens & security headers

| Field | Value |
|---|---|
| Epic | E-00 — Platform Foundation |
| Sprint | SPRINT-001 |
| Status | **done** |
| Story points | 3 |

## User Story

**As a** HR Admin
**I want** a consistent branded shell with navigation
**so that** the tool feels like the familiar Cloudtech KPI report and is easy to move around

## Acceptance Criteria

- [x] AC-1: Given any authenticated page, then a navy header (`#10233F`) with a teal top border shows the product name and nav links (Dashboard, Rankings, Imports, Employees, Settings, Audit), and the active link is indicated by more than colour alone.
- [x] AC-2: Given any response, then a per-request CSP with a nonce is set by `proxy.ts`, plus `X-Content-Type-Options`, `Referrer-Policy` and `frame-ancestors 'none'`.
- [x] AC-3: Given a 360 px wide viewport, then there is no horizontal scroll and the nav collapses into a menu button that works by keyboard.

## Dates

- Created:      2026-10-15 11:45 UTC
- Last updated: 2026-10-15 14:56 UTC
- Completed:    2026-10-15 14:56 UTC
