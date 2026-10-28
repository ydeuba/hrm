# E-02-01 — Secure upload & original-file storage · Implementation record

## Files
- Domain (pure): `src/domain/import/zip-inspector.ts` reads the ZIP central directory without decompressing anything. `src/domain/import/upload-policy.ts` holds the extension, signature, macro, encryption and size rules.
- Application: `src/application/ports/file-store.ts` (FileStore, ContentHasher), `src/application/use-cases/imports/receive-upload.ts`.
- Infrastructure: `src/infrastructure/files/local-file-store.ts` (DATA_DIR-confined keys; SHA-256 hasher), container wiring.
- Presentation: `src/app/_lib/read-upload.ts` (Content-Length check + byte-counted streaming read + multipart parse), `src/app/api/v1/imports/route.ts` (`POST`, session-protected).
- Tests: `tests/unit/domain/import/upload-policy.test.ts`, `tests/integration/app/upload-route.test.ts`, `tests/helpers/zip.ts` (a hand-rolled ZIP builder for macro and zip-bomb fixtures).

## Notes
- For now the route returns `201 { upload: { fileName, fileHash, size, kind } }`. E-02-05 extends the same endpoint into the import preview.
- When the streaming limit is exceeded, the reader lock is released rather than cancelled, because undici otherwise raises an unhandled "stream already closed" rejection.
- Rejected reasons: `.xlsm` / `vbaProject.bin` (macros), CFB signature (password-protected or legacy .xls), non-ZIP `.xlsx`, missing `[Content_Types].xml`, more than 200 parts, more than 50 MB uncompressed, ZIP64, damaged archive, non-UTF-8 or binary CSV, other extensions, empty file.

## Acceptance criteria status
- [x] AC-1: satisfied — `Content-Length` over the limit → 413 `IMPORT_TOO_LARGE` without reading the body (the test body stream errors if read); oversized streamed bodies → 413.
- [x] AC-2: satisfied — `.xlsm`, encrypted, wrong-signature and zip-bomb files → 400 `IMPORT_INVALID_FILE` with a specific reason.
- [x] AC-3: satisfied — a valid file is stored byte-identical at `DATA_DIR/uploads/<sha256>.xlsx` and the hash is returned; storage keys can't escape DATA_DIR.
