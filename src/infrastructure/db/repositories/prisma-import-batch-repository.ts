import 'server-only';
import type {
  BatchStatus,
  ImportBatchRecord,
  ImportBatchRepository,
  ImportIssueRecord,
  NewPreviewBatch,
} from '@/application/ports/imports';
import type { PreviewSnapshot } from '@/application/use-cases/imports/preview-dto';
import type { ImportIssueDraft, IssueCode } from '@/domain/import/issues';
import type { ParsedMasterSheet } from '@/domain/import/master-sheet';
import type { SprintCode } from '@/domain/kpi/sprint-code';
import { Prisma } from '../../../../generated/prisma/client';
import { toJson } from '../json';
import type { Db } from '../prisma';

const BATCH_FIELDS = {
  id: true, fileName: true, fileHash: true, fileKey: true, fileSize: true, status: true, baseRevision: true, commitRevision: true,
  sheetName: true, headerRow: true, sprints: true, parsed: true, summary: true, actorId: true, createdAt: true, expiresAt: true,
  committedAt: true, rolledBackAt: true, actor: { select: { email: true } },
} as const;

type BatchRow = {
  id: string; fileName: string; fileHash: string; fileKey: string | null; fileSize: number; status: BatchStatus; baseRevision: number;
  commitRevision: number | null; sheetName: string; headerRow: number; sprints: unknown; parsed: unknown; summary: unknown; actorId: string;
  createdAt: Date; expiresAt: Date; committedAt: Date | null; rolledBackAt: Date | null; actor: { email: string };
};

function toRecord(r: BatchRow): ImportBatchRecord {
  const snapshot = r.summary as PreviewSnapshot;
  return {
    id: r.id, fileName: r.fileName, fileHash: r.fileHash, fileKey: r.fileKey, fileSize: r.fileSize, status: r.status,
    baseRevision: r.baseRevision, commitRevision: r.commitRevision, sheetName: r.sheetName, headerRow: r.headerRow,
    sprints: r.sprints as SprintCode[], parsed: (r.parsed as ParsedMasterSheet | null) ?? null, summary: r.summary,
    actorId: r.actorId, actorEmail: r.actor.email, createdAt: r.createdAt, expiresAt: r.expiresAt, committedAt: r.committedAt,
    rolledBackAt: r.rolledBackAt, errorCount: snapshot.summary.errors, warningCount: snapshot.summary.warnings,
  };
}

const toSeverity = (s: ImportIssueDraft['severity']) => (s === 'error' ? 'ERROR' : 'WARNING') as 'ERROR' | 'WARNING';

export class PrismaImportBatchRepository implements ImportBatchRepository {
  constructor(private readonly db: Db) {}

  async createPreview(b: NewPreviewBatch): Promise<string> {
    const created = await this.db.importBatch.create({
      data: {
        fileName: b.fileName, fileHash: b.fileHash, fileKey: b.fileKey, fileSize: b.fileSize, status: 'PREVIEW', baseRevision: b.baseRevision,
        sheetName: b.sheet.sheetName, headerRow: b.sheet.headerRow, sprints: toJson(b.sheet.sprints), parsed: toJson(b.sheet),
        summary: toJson(b.summary), actorId: b.actorId, createdAt: b.createdAt, expiresAt: b.expiresAt,
        issues: {
          create: b.issues.map((i) => ({
            severity: toSeverity(i.severity), code: i.code, row: i.row, column: i.column, employeeName: i.employeeName, message: i.message,
            sheetValue: i.sheetValue ?? null, computedValue: i.computedValue ?? null,
          })),
        },
      },
      select: { id: true },
    });
    return created.id;
  }

  async findById(id: string): Promise<ImportBatchRecord | null> {
    const r = await this.db.importBatch.findUnique({ where: { id }, select: BATCH_FIELDS });
    return r ? toRecord(r as BatchRow) : null;
  }

  async issuesFor(batchId: string): Promise<ImportIssueRecord[]> {
    const rows = await this.db.importIssue.findMany({
      where: { batchId },
      orderBy: [{ severity: 'asc' }, { row: 'asc' }],
      select: { id: true, severity: true, code: true, row: true, column: true, employeeName: true, message: true, sheetValue: true, computedValue: true },
    });
    return rows.map((r) => ({
      id: r.id, severity: r.severity === 'ERROR' ? 'error' : 'warning', code: r.code as IssueCode, row: r.row, column: r.column,
      employeeName: r.employeeName, message: r.message,
      ...(r.sheetValue === null ? {} : { sheetValue: r.sheetValue }),
      ...(r.computedValue === null ? {} : { computedValue: r.computedValue }),
    }));
  }

  async setStatus(id: string, status: 'DISCARDED' | 'EXPIRED'): Promise<void> {
    await this.db.importBatch.updateMany({ where: { id, status: 'PREVIEW' }, data: { status, parsed: Prisma.DbNull } });
  }

  async expirePreviews(now: Date): Promise<number> {
    const r = await this.db.importBatch.updateMany({ where: { status: 'PREVIEW', expiresAt: { lte: now } }, data: { status: 'EXPIRED' } });
    return r.count;
  }

  async lastCommittedWithHash(fileHash: string): Promise<{ id: string; committedAt: Date } | null> {
    const r = await this.db.importBatch.findFirst({
      where: { fileHash, status: 'COMMITTED' },
      orderBy: { committedAt: 'desc' },
      select: { id: true, committedAt: true },
    });
    return r?.committedAt ? { id: r.id, committedAt: r.committedAt } : null;
  }

  async latestCommitted(): Promise<ImportBatchRecord | null> {
    const r = await this.db.importBatch.findFirst({ where: { status: 'COMMITTED' }, orderBy: { committedAt: 'desc' }, select: BATCH_FIELDS });
    return r ? toRecord(r as BatchRow) : null;
  }

  async latestCommittedRef(): Promise<{ id: string; fileName: string; committedAt: Date } | null> {
    const r = await this.db.importBatch.findFirst({
      where: { status: 'COMMITTED' },
      orderBy: { committedAt: 'desc' },
      select: { id: true, fileName: true, committedAt: true },
    });
    return r?.committedAt ? { id: r.id, fileName: r.fileName, committedAt: r.committedAt } : null;
  }

  async list(page: { cursor?: string; limit: number }): Promise<{ items: ImportBatchRecord[]; nextCursor: string | null }> {
    const rows = await this.db.importBatch.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: page.limit + 1,
      ...(page.cursor ? { cursor: { id: page.cursor }, skip: 1 } : {}),
      select: BATCH_FIELDS,
    });
    const items = rows.slice(0, page.limit).map((r) => toRecord(r as BatchRow));
    return { items, nextCursor: rows.length > page.limit ? (items.at(-1)?.id ?? null) : null };
  }

  purgeOriginals(cutoff: Date): Promise<string[]> {
    return this.db.$transaction(async (tx) => {
      const old = await tx.importBatch.findMany({ where: { createdAt: { lt: cutoff }, fileKey: { not: null } }, select: { id: true, fileKey: true } });
      if (old.length === 0) return [];
      await tx.importBatch.updateMany({ where: { id: { in: old.map((b) => b.id) } }, data: { fileKey: null, parsed: Prisma.DbNull } });
      const keys = [...new Set(old.flatMap((b) => (b.fileKey ? [b.fileKey] : [])))];
      const stillUsed = await tx.importBatch.findMany({ where: { fileKey: { in: keys } }, select: { fileKey: true } });
      const used = new Set(stillUsed.map((b) => b.fileKey));
      return keys.filter((k) => !used.has(k));
    });
  }
}
