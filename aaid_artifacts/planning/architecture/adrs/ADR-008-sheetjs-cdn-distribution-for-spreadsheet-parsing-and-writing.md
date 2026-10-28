# ADR-008: SheetJS (CDN distribution) for spreadsheet parsing and writing, cached values only

_Source of truth: [architecture.md](../architecture.md) — extracted 2026-10-15._

- **Status**: Accepted
- **Context**: The master sheet uses formulas and external workbook links (`'[1]Team Bravo'!C6`). We need the cached values, header detection and `.xlsx` export. The npm-registry package `xlsx@0.18.5` has known vulnerabilities (prototype pollution CVE-2023-30533, ReDoS CVE-2024-22363), which would fail NFR-14.
- **Decision**: Use **SheetJS Community Edition ≥ 0.20.3 installed from `https://cdn.sheetjs.com/`** (tarball URL in `package.json`), wrapped behind the `SpreadsheetReader`/`SpreadsheetWriter` ports. Read with `{cellFormula: false, cellHTML: false, sheetStubs: false, dense: true}` and never evaluate formulas. Use raw numeric values (`cell.v`), not formatted text.

  **Upload hardening:**
  1. Reject when `Content-Length > UPLOAD_MAX_BYTES` before reading the body, and count bytes while streaming (Route Handlers have no built-in limit).
  2. Validate the file signature: the ZIP magic bytes `PK\x03\x04` for `.xlsx`, or UTF-8 text for `.csv`. Reject `.xlsm` and encrypted files (CFB magic bytes `D0 CF 11 E0`).
  3. **Zip-bomb guard:** before SheetJS parses the file, read the ZIP central directory and reject if the total uncompressed size exceeds 50 MB or there are more than 200 entries. Rejected alternative: ExcelJS (heavier and slower on read, and it adds no value for this layout).
- **Consequences**: One library for reading and writing, and it is fast (a 5 MB workbook parses in under 1 s). The CDN-hosted dependency must be pinned with an integrity hash in the lockfile. Because the library sits behind a port, it can be swapped if licensing or security changes.
