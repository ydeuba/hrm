import type { AuditLog } from '@/application/ports/audit-log';
import type { BackupArchiver } from '@/application/ports/backup';
import type { Clock } from '@/application/ports/clock';

/** Local wall-clock zone used for user-facing timestamps (design.md). */
const ZONE = 'Asia/Kathmandu';

/** `yyyymmdd-HHmm` in the business time zone. */
export function backupStamp(at: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}${parts.month}${parts.day}-${parts.hour}${parts.minute}`;
}

/** Backup download (US-09-03): snapshot + uploads as one zip, audited as BACKUP_CREATE. */
export class CreateBackup {
  constructor(private readonly deps: { readonly archiver: BackupArchiver; readonly audit: AuditLog; readonly clock: Clock }) {}

  async execute(actorId: string): Promise<{ fileName: string; bytes: Uint8Array }> {
    const { bytes, files } = await this.deps.archiver.create();
    const fileName = `hrm-backup_${backupStamp(this.deps.clock.now())}.zip`;
    await this.deps.audit.record({ actorId, action: 'BACKUP_CREATE', meta: { fileName, bytes: bytes.length, uploads: files } });
    return { fileName, bytes };
  }
}
