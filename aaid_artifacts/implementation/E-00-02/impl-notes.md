# E-00-02 — Project scaffold & quality gates · Implementation record

## Files
- `package.json`: pinned versions from E-00-01; scripts `dev/build/start/typecheck/lint/test/test:coverage/test:e2e/db:*/verify`; `overrides` for Prisma's transitive advisories.
- `tsconfig.json`: strict, `noUncheckedIndexedAccess`, `@/*` → `src/*`.
- `next.config.ts`: standalone output, static security headers, native packages kept external.
- `eslint.config.mjs`: flat config; typescript-eslint `strict`; `complexity: 10`; `no-explicit-any`; per-layer `no-restricted-imports`.
- `vitest.config.mts`: v8 coverage with `json-summary` (read by the aaid coverage gate); 80% global threshold, 100% for `src/domain/**`.
- `playwright.config.ts`: chromium, isolated web server (start script added with the first e2e story).
- `postcss.config.mjs`, `src/app/globals.css` (design tokens), `src/app/layout.tsx`, `src/app/page.tsx`.
- `src/domain/shared/result.ts`, `errors.ts` + tests; `tests/unit/tooling/lint-rules.test.ts`.
- `.gitignore`, `.env.example`, `README.md`.

## Decisions
1. **Layer boundaries use core `no-restricted-imports`, not `eslint-plugin-boundaries`.** The latter (and `eslint-config-next`) pull in `handlebars <4.7.10` (critical) and `braces` (high; no fixed version), which made `npm audit --json`, and therefore the aaid security gate, fail. Core regex patterns enforce the same rules with zero dependencies. A unit test lints virtual files to prove each rule.
2. **The aaid code-standards gate bans `: any`, `@ts-ignore`, `eval(` and `SELECT *`, and flags awaited queries inside loops.** These are kept in mind for all code.
3. UI `.tsx` files are excluded from unit coverage (they are covered by Playwright); pure type and port modules are excluded because they have no statements.
4. `vitest.config.mts` (not `.ts`) avoids Vite's "ESM in CJS" config warning, without switching the whole package to `"type": "module"`.

## Verification
`npm run typecheck` ✓ · `npm run lint` ✓ · `npm run test:coverage` ✓ (15 tests, 100%) · `npm run build` ✓ (Next 16.4.1 Turbopack) · `npm audit` → 0 vulnerabilities.

## Acceptance criteria status
- [x] AC-1: satisfied — `npm run verify` steps all pass on the scaffold (each was run individually: typecheck, lint, coverage, build).
- [x] AC-2: satisfied — `tests/unit/tooling/lint-rules.test.ts` proves domain→infrastructure, domain→`next/*`, domain→third-party, escaping relative imports, application→infrastructure, and presentation→infrastructure internals all fail lint.
- [x] AC-3: satisfied — the same test proves a complexity-11 function fails and a complexity-10 function passes.
- [x] AC-4: satisfied — folder layout per the architecture; `data/` and `.env*` are git-ignored (`!.env.example`); `.env.example` documents every variable.
