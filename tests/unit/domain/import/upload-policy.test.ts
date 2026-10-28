import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { extensionOf, validateUpload, type UploadLimits } from '@/domain/import/upload-policy';
import { inspectZip } from '@/domain/import/zip-inspector';
import { buildZip, MINIMAL_XLSX_PARTS } from '../../../helpers/zip';

const limits: UploadLimits = { maxBytes: 5 * 1024 * 1024, maxUncompressedBytes: 50 * 1024 * 1024, maxZipEntries: 200 };
const sample = new Uint8Array(readFileSync(path.resolve(__dirname, '../../../fixtures/kpi-master-sheet.xlsx')));
const reason = (r: ReturnType<typeof validateUpload>) => (r.ok ? null : r.error);

describe('inspectZip', () => {
  it('reads the central directory of the real master sheet', () => {
    const z = inspectZip(sample);
    expect(z.ok).toBe(true);
    if (z.ok) {
      expect(z.value.names).toContain('[Content_Types].xml');
      expect(z.value.entries).toBe(z.value.names.length);
      expect(z.value.uncompressedBytes).toBeGreaterThan(sample.length);
    }
  });

  it('reports corrupt and ZIP64 archives', () => {
    expect(inspectZip(new Uint8Array([1, 2, 3]))).toEqual({ ok: false, error: 'CORRUPT' });
    expect(inspectZip(new Uint8Array(64))).toEqual({ ok: false, error: 'CORRUPT' });
    const zip = buildZip(MINIMAL_XLSX_PARTS);
    const badOffset = zip.slice();
    new DataView(badOffset.buffer).setUint32(badOffset.length - 6, badOffset.length + 10, true);
    expect(inspectZip(badOffset)).toEqual({ ok: false, error: 'CORRUPT' });
    const badSig = zip.slice();
    const cdOffset = new DataView(zip.buffer).getUint32(zip.length - 6, true);
    badSig[cdOffset] = 0;
    expect(inspectZip(badSig)).toEqual({ ok: false, error: 'CORRUPT' });
    expect(inspectZip(buildZip([{ name: 'a', declaredSize: 0xffffffff }]))).toEqual({ ok: false, error: 'ZIP64' });
    const z64 = zip.slice();
    new DataView(z64.buffer).setUint16(z64.length - 12, 0xffff, true);
    expect(inspectZip(z64)).toEqual({ ok: false, error: 'ZIP64' });
  });
});

describe('validateUpload (E-02-01)', () => {
  it('accepts the real .xlsx master sheet and UTF-8 CSV', () => {
    expect(validateUpload('KPI Master Sheet (2).xlsx', sample, limits)).toEqual({ ok: true, value: 'xlsx' });
    expect(validateUpload('scores.CSV', new TextEncoder().encode('Resources,Designation,S1\nA,SE,9'), limits)).toEqual({ ok: true, value: 'csv' });
  });

  it('AC-1: rejects files over the size limit as IMPORT_TOO_LARGE', () => {
    expect(reason(validateUpload('a.xlsx', sample, { ...limits, maxBytes: 1000 }))?.code).toBe('IMPORT_TOO_LARGE');
  });

  it('AC-2: rejects .xlsm, macros, encrypted/legacy, wrong signature, other extensions and empty files', () => {
    expect(reason(validateUpload('a.xlsm', sample, limits))?.reason).toMatch(/Macro-enabled/);
    expect(reason(validateUpload('a.xlsx', buildZip([...MINIMAL_XLSX_PARTS, { name: 'xl/vbaProject.bin' }]), limits))?.reason).toMatch(/Macro-enabled/);
    expect(reason(validateUpload('a.xlsx', new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 1, 2]), limits))?.reason).toMatch(/Password-protected/);
    expect(reason(validateUpload('a.xlsx', new TextEncoder().encode('not a zip'), limits))?.reason).toMatch(/not a valid/);
    expect(reason(validateUpload('a.pdf', sample, limits))?.reason).toMatch(/Only .xlsx and .csv/);
    expect(reason(validateUpload('a.xlsx', new Uint8Array(), limits))?.reason).toMatch(/empty/);
    expect(reason(validateUpload('a.xlsx', buildZip([{ name: 'x.txt', data: new Uint8Array([1]) }]), limits))?.reason).toMatch(/not a valid/);
  });

  it('AC-2: rejects zip bombs by uncompressed size and entry count, and damaged archives', () => {
    const bomb = buildZip([...MINIMAL_XLSX_PARTS, { name: 'xl/big.xml', declaredSize: 60 * 1024 * 1024 }]);
    expect(reason(validateUpload('a.xlsx', bomb, limits))?.reason).toMatch(/expands beyond/);
    const many = buildZip([...MINIMAL_XLSX_PARTS, ...Array.from({ length: 200 }, (_, i) => ({ name: `p${i}` }))]);
    expect(reason(validateUpload('a.xlsx', many, limits))?.reason).toMatch(/too many parts/);
    const zip64 = buildZip([...MINIMAL_XLSX_PARTS, { name: 'x', declaredSize: 0xffffffff }]);
    expect(reason(validateUpload('a.xlsx', zip64, limits))?.reason).toMatch(/too large/);
    const damaged = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0]);
    expect(reason(validateUpload('a.xlsx', damaged, limits))?.reason).toMatch(/damaged/);
  });

  it('rejects binary or non-UTF-8 CSV', () => {
    expect(reason(validateUpload('a.csv', new Uint8Array([65, 0, 66]), limits))?.reason).toMatch(/binary/);
    expect(reason(validateUpload('a.csv', new Uint8Array([0xff, 0xfe, 0x41]), limits))?.reason).toMatch(/UTF-8/);
  });

  it('extensionOf', () => {
    expect(extensionOf('a.b.XLSX')).toBe('xlsx');
    expect(extensionOf('noext')).toBe('');
  });
});
