import { describe, expect, it } from 'vitest';
import { EnvError, loadEnv } from '@/infrastructure/env';

const base = { DATABASE_URL: 'file:./data/hrm.db', DATA_DIR: './data' };

describe('loadEnv', () => {
  it('applies defaults for optional variables', () => {
    const env = loadEnv(base);
    expect(env.SESSION_IDLE_MINUTES).toBe(60);
    expect(env.SESSION_ABSOLUTE_HOURS).toBe(12);
    expect(env.UPLOAD_MAX_BYTES).toBe(5 * 1024 * 1024);
    expect(env.UPLOAD_MAX_UNCOMPRESSED_BYTES).toBe(50 * 1024 * 1024);
    expect(env.TRUSTED_ORIGINS).toEqual([]);
    expect(env.APP_TIMEZONE).toBe('Asia/Kathmandu');
    expect(env.LOG_LEVEL).toBe('info');
  });

  it('coerces numeric strings', () => {
    expect(loadEnv({ ...base, SESSION_IDLE_MINUTES: '30' }).SESSION_IDLE_MINUTES).toBe(30);
  });

  it('parses TRUSTED_ORIGINS into normalised origins', () => {
    const env = loadEnv({ ...base, TRUSTED_ORIGINS: ' https://hrm.example.com/ , http://10.0.0.5:3000 ' });
    expect(env.TRUSTED_ORIGINS).toEqual(['https://hrm.example.com', 'http://10.0.0.5:3000']);
  });

  it('names every missing required variable', () => {
    try {
      loadEnv({});
      expect.unreachable('loadEnv should throw');
    } catch (error) {
      expect(error).toBeInstanceOf(EnvError);
      const e = error as EnvError;
      expect(e.variables).toEqual(expect.arrayContaining(['DATABASE_URL', 'DATA_DIR']));
      expect(e.message).toContain('DATABASE_URL');
      expect(e.message).toContain('DATA_DIR');
    }
  });

  it('names invalid variables', () => {
    expect(() => loadEnv({ ...base, SESSION_IDLE_MINUTES: 'abc' })).toThrow(/SESSION_IDLE_MINUTES/);
    expect(() => loadEnv({ ...base, DATABASE_URL: 'postgres://x' })).toThrow(/DATABASE_URL/);
    expect(() => loadEnv({ ...base, TRUSTED_ORIGINS: 'not a url' })).toThrow(/TRUSTED_ORIGINS/);
    expect(() => loadEnv({ ...base, LOG_LEVEL: 'loud' })).toThrow(/LOG_LEVEL/);
  });
});
