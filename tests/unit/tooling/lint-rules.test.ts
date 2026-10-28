import { describe, expect, it } from 'vitest';
import { ESLint } from 'eslint';

/**
 * Guards the architecture rules wired into eslint.config.mjs (E-00-02 AC-2, AC-3).
 * Lints virtual files so no fixture files are left in src/.
 */
const eslint = new ESLint({ cwd: process.cwd() });

async function lint(code: string, filePath: string) {
  const [result] = await eslint.lintText(code, { filePath });
  return result?.messages ?? [];
}

const ruleIds = (messages: { ruleId: string | null }[]) => messages.map((m) => m.ruleId);

describe('layer boundaries', () => {
  it('rejects domain → infrastructure imports', async () => {
    const msgs = await lint("import { x } from '@/infrastructure/container';\nexport const y = x;\n", 'src/domain/kpi/probe.ts');
    expect(ruleIds(msgs)).toContain('no-restricted-imports');
  });

  it('rejects domain → next imports', async () => {
    const msgs = await lint("import { redirect } from 'next/navigation';\nexport const y = redirect;\n", 'src/domain/kpi/probe.ts');
    expect(ruleIds(msgs)).toContain('no-restricted-imports');
  });

  it('rejects domain → third-party packages (domain is dependency-free)', async () => {
    const msgs = await lint("import { z } from 'zod';\nexport const y = z;\n", 'src/domain/kpi/probe.ts');
    expect(ruleIds(msgs)).toContain('no-restricted-imports');
  });

  it('rejects relative imports escaping the domain layer', async () => {
    const msgs = await lint("import { x } from '../../infrastructure/env';\nexport const y = x;\n", 'src/domain/kpi/probe.ts');
    expect(ruleIds(msgs)).toContain('no-restricted-imports');
  });

  it('allows domain → domain imports', async () => {
    const msgs = await lint(
      "import { ok } from '@/domain/shared/result';\nimport { err } from '../shared/result';\nexport const y = [ok, err];\n",
      'src/domain/kpi/probe.ts',
    );
    expect(ruleIds(msgs)).not.toContain('no-restricted-imports');
  });

  it('rejects application → infrastructure imports', async () => {
    const msgs = await lint("import { x } from '@/infrastructure/db/prisma';\nexport const y = x;\n", 'src/application/use-cases/probe.ts');
    expect(ruleIds(msgs)).toContain('no-restricted-imports');
  });

  it('rejects presentation → infrastructure internals but allows the container', async () => {
    const bad = await lint("import { x } from '@/infrastructure/db/prisma';\nexport const y = x;\n", 'src/app/probe.ts');
    expect(ruleIds(bad)).toContain('no-restricted-imports');
    const good = await lint("import { getContainer } from '@/infrastructure/container';\nexport const y = getContainer;\n", 'src/app/probe.ts');
    expect(ruleIds(good)).not.toContain('no-restricted-imports');
  });
});

describe('complexity limit', () => {
  const branches = (n: number) =>
    Array.from({ length: n }, (_, i) => `  if (v === ${i}) return ${i};`).join('\n');

  it('fails a function with cyclomatic complexity 11', async () => {
    const code = `export function f(v: number): number {\n${branches(10)}\n  return -1;\n}\n`;
    expect(ruleIds(await lint(code, 'src/domain/kpi/probe.ts'))).toContain('complexity');
  });

  it('passes a function with cyclomatic complexity 10', async () => {
    const code = `export function f(v: number): number {\n${branches(9)}\n  return -1;\n}\n`;
    expect(ruleIds(await lint(code, 'src/domain/kpi/probe.ts'))).not.toContain('complexity');
  });
});

describe('type safety', () => {
  it('rejects explicit any', async () => {
    const msgs = await lint('export const f = (x: any) => x;\n', 'src/domain/kpi/probe.ts');
    expect(ruleIds(msgs)).toContain('@typescript-eslint/no-explicit-any');
  });
});
