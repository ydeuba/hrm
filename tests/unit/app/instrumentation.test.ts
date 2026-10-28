import { afterEach, describe, expect, it, vi } from 'vitest';
import { register } from '@/instrumentation';

const saved = { ...process.env };
afterEach(() => {
  process.env = { ...saved };
  vi.restoreAllMocks();
});

describe('instrumentation register (E-00-04 AC-1)', () => {
  it('exits with a message naming the bad variable when env is invalid', async () => {
    process.env = { NODE_ENV: 'test', NEXT_RUNTIME: 'nodejs', DATA_DIR: './data' };
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await register();
    expect(exit).toHaveBeenCalledWith(1);
    expect(String(log.mock.calls[0]?.[0])).toContain('DATABASE_URL');
  });

  it('starts normally with a valid env', async () => {
    process.env = { NODE_ENV: 'test', NEXT_RUNTIME: 'nodejs', DATABASE_URL: 'file:./data/hrm.db', DATA_DIR: './data' };
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    await register();
    expect(exit).not.toHaveBeenCalled();
  });

  it('skips validation outside the Node.js runtime', async () => {
    process.env = { NODE_ENV: 'test', NEXT_RUNTIME: 'edge' };
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    await register();
    expect(exit).not.toHaveBeenCalled();
  });
});
