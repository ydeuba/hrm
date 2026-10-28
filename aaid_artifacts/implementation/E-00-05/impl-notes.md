# E-00-05 — App shell, design tokens & security headers · Implementation record

## Files
- `src/proxy.ts` (Next 16 request gate): generates a nonce per request, sets the CSP on the response, and forwards `x-nonce` + CSP on the request so Next.js stamps its inline scripts.
- `src/app/_lib/csp.ts`: `buildCsp(nonce, isDev)`, `createNonce()`.
- `src/app/layout.tsx`: reads the request headers, so every page renders dynamically (required for nonces); metadata and viewport.
- `src/components/shell/{app-shell.tsx,main-nav.tsx,nav-items.ts}`: navy header with a teal top border, skip link, six nav links, `aria-current` plus bold + underline for the active link, and a mobile menu button (`aria-expanded`, Esc closes).
- `src/app/(app)/layout.tsx`, `src/app/(app)/dashboard/page.tsx` (empty state with an upload CTA), `src/app/not-found.tsx`.
- e2e: `tests/e2e/start-server.ts` (isolated temporary DB, build + start), `tests/e2e/shell.spec.ts`; unit: `tests/unit/app/csp-nav.test.ts`.
- Tooling: `@axe-core/playwright`; Chromium installed for Playwright.

## Notes
- Nav targets other than Dashboard show the styled 404 until their stories land.
- I removed `output: 'standalone'`, because `next start` warns against it. It will be re-enabled for the container image when the app moves to a server.
- The authentication gate is added to `proxy.ts` by E-01-02.

## Acceptance criteria status
- [x] AC-1: satisfied — e2e asserts the navy header (`rgb(16,35,63)`), product name, all six nav links, and that the active link has `aria-current="page"`, bold weight and underline.
- [x] AC-2: satisfied — e2e asserts a nonce `script-src` that differs per request, `frame-ancestors 'none'`, `nosniff`, `Referrer-Policy`, no `X-Powered-By`, and no CSP console errors (the page hydrates).
- [x] AC-3: satisfied — at 360 px, e2e asserts no horizontal overflow; the menu button opens on Enter and closes on Esc (`aria-expanded`).
- [x] DoD axe check: 0 serious or critical WCAG 2.1 A/AA violations.
