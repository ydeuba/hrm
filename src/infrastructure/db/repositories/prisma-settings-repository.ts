import 'server-only';
import { settingsFromStored } from '@/application/contracts/settings';
import type { SettingsRepository, SettingsWriter } from '@/application/ports/settings';
import type { KpiSettings } from '@/domain/settings/kpi-settings';
import { toJson } from '../json';
import type { Db } from '../prisma';

export class PrismaSettingsRepository implements SettingsRepository, SettingsWriter {
  constructor(private readonly db: Db) {}

  async get(): Promise<KpiSettings> {
    const row = await this.db.appSettings.findUnique({ where: { id: 1 }, select: { data: true } });
    return settingsFromStored(row?.data);
  }

  async save(settings: KpiSettings, actorId: string): Promise<void> {
    await this.db.$transaction([
      this.db.appSettings.upsert({
        where: { id: 1 },
        create: { id: 1, data: toJson(settings), updatedBy: actorId },
        update: { data: toJson(settings), updatedBy: actorId },
        select: { id: true },
      }),
      this.db.systemState.update({ where: { id: 1 }, data: { settingsRevision: { increment: 1 } }, select: { id: true } }),
    ]);
  }
}
