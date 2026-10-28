// ESLint flat config.
// Layer boundaries (ADR-002) are enforced with core `no-restricted-imports`
// rather than eslint-plugin-boundaries, whose dependency tree carries
// unfixable advisories that would fail the aaid security gate.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

const ESCAPE_TWO_LEVELS = '^(\\.\\./){2,}';

const layerRules = {
  domain: [
    {
      regex: '^(?!\\.{1,2}/|@/domain/)',
      message: 'src/domain is pure TypeScript: import only from @/domain/* or relative domain files (ADR-002).',
    },
    { regex: ESCAPE_TWO_LEVELS, message: 'Relative import escapes the domain layer — use @/domain/*.' },
  ],
  application: [
    {
      regex: '^(@/(infrastructure|app|components)(/|$)|next(/|$)|react(-dom)?(/|$)|@prisma/|better-sqlite3|xlsx$)',
      message: 'src/application may depend only on @/domain, zod and its own ports (ADR-002).',
    },
    { regex: ESCAPE_TWO_LEVELS, message: 'Relative import escapes the application layer — use @/… aliases.' },
  ],
  infrastructure: [
    {
      regex: '^(@/(app|components)(/|$)|react(-dom)?(/|$)|next(/|$))',
      message: 'src/infrastructure must not depend on presentation code (ADR-002).',
    },
  ],
  presentation: [
    {
      regex: '^@/infrastructure/(?!container$|env$)',
      message: 'Presentation may only reach infrastructure through @/infrastructure/container (ADR-002).',
    },
    { regex: '@prisma/|/generated(/|$)', message: 'Prisma types must not leak into presentation — use DTOs.' },
  ],
};

const restrict = (patterns) => ({ 'no-restricted-imports': ['error', { patterns }] });

export default tseslint.config(
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'coverage/**',
      'data/**',
      'playwright-report/**',
      'test-results/**',
      'generated/**',
      'next-env.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      complexity: ['error', 10],
      'max-depth': ['error', 4],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
    },
  },
  {
    files: ['src/**/*.tsx', 'src/components/**/*.ts'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
  { files: ['src/domain/**/*.ts'], rules: restrict(layerRules.domain) },
  { files: ['src/application/**/*.ts'], rules: restrict(layerRules.application) },
  { files: ['src/infrastructure/**/*.ts'], rules: restrict(layerRules.infrastructure) },
  { files: ['src/app/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}', 'src/proxy.ts'], rules: restrict(layerRules.presentation) },
  {
    files: ['scripts/**/*.ts', 'prisma/**/*.ts', 'tests/**/*.ts', '*.config.{ts,mjs}'],
    rules: { 'no-console': 'off' },
  },
);
