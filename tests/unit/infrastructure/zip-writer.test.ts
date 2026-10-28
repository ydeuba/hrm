import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { writeZip } from '@/infrastructure/files/zip-writer';
import { backupStamp } from '@/application/use-cases/backup/create-backup';

const enc = new TextEncoder();

describe('writeZip', () => {
  it('produces an archive standard readers can extract byte-for-byte', () => {
    const big = new Uint8Array(50_000).map((_, i) => i % 7);
    // ASCII names: SheetJS's reader ignores the UTF-8 flag (verified separately with Windows Expand-Archive).
    const zip = writeZip([{ name: 'hrm.db', bytes: big }, { name: 'uploads/a.xlsx', bytes: enc.encode('hello') }, { name: 'empty', bytes: new Uint8Array() }], new Date(2026, 9, 16, 11, 30, 10));
    const cfb = XLSX.CFB.read(zip, { type: 'array' });
    const entry = (name: string) => cfb.FileIndex[(cfb.FullPaths as string[]).indexOf(`Root Entry/${name}`)]?.content as Uint8Array;
    expect(Array.from(entry('hrm.db'))).toEqual(Array.from(big));
    expect(new TextDecoder().decode(entry('uploads/a.xlsx'))).toBe('hello');
    expect(zip.length).toBeLessThan(big.length);
  });

  it('writes an empty archive', () => {
    expect(writeZip([], new Date(2026, 0, 1))).toHaveLength(22);
  });
});

describe('backupStamp', () => {
  it('formats yyyymmdd-HHmm in Asia/Kathmandu (UTC+05:45)', () => {
    expect(backupStamp(new Date('2026-10-16T18:20:00Z'))).toBe('20261017-0005');
  });
});
