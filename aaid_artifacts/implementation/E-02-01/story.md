---
story_id: E-02-01
epic_id: E-02
sprint: SPRINT-001
status: done
story_points: 3
completed_at: 2026-10-15T15:52:12.577Z
---

# E-02-01: Secure upload & original-file storage

| Field | Value |
|---|---|
| Epic | E-02 — Excel KPI Import & Validation |
| Sprint | SPRINT-001 |
| Status | **done** |
| Story points | 3 |

## User Story

**As a** HR Admin
**I want** to upload the master sheet safely
**so that** a wrong or malicious file can't harm the system

## Acceptance Criteria

- [x] AC-1: Given `Content-Length` > 5 MB, then 413 `IMPORT_TOO_LARGE` is returned before the body is read.
- [x] AC-2: Given a `.xlsm`, an encrypted workbook, a wrong magic number, or a ZIP whose uncompressed size is over 50 MB or has more than 200 entries, then 400 `IMPORT_INVALID_FILE` with a specific reason.
- [x] AC-3: Given a valid file, then it is stored at `DATA_DIR/uploads/<sha256>.<ext>` outside the web root, and the hash is returned.

## Dates

- Created:      2026-10-15 11:45 UTC
- Last updated: 2026-10-15 15:52 UTC
- Completed:    2026-10-15 15:52 UTC
