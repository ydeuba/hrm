import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDb, type TestDb } from '../../helpers/test-db';
import { seedReferenceData } from '@/infrastructure/db/seed-reference';
import { DEFAULT_KPI_SETTINGS } from '@/domain/settings/defaults';

let t: TestDb;

beforeAll(async () => {
  t = await createTestDb();
});

afterAll(async () => {
  await t.cleanup();
});

const EXPECTED_TABLES = [
  'AdminUser', 'Session', 'LoginThrottle', 'Team', 'TeamAlias', 'Designation', 'DesignationAlias', 'Sprint',
  'Employee', 'EmployeeAlias', 'Score', 'ImportBatch', 'ImportIssue', 'ImportChange', 'AppSettings',
  'SystemState', 'AuditEvent',
];

describe('schema (E-00-03 AC-1)', () => {
  it('creates every entity table from the data model', async () => {
    const rows = await t.db.$queryRawUnsafe<{ name: string }[]>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE '\\_%' ESCAPE '\\' AND name NOT LIKE 'sqlite_%'",
    );
    expect(rows.map((r) => r.name).sort()).toEqual([...EXPECTED_TABLES].sort());
  });

  it('creates the unique constraints that identity relies on', async () => {
    const rows = await t.db.$queryRawUnsafe<{ name: string }[]>(
      "SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE '%_key'",
    );
    const names = rows.map((r) => r.name);
    for (const idx of [
      'AdminUser_email_key', 'Session_tokenHash_key', 'TeamAlias_normalisedName_key',
      'DesignationAlias_normalisedName_key', 'EmployeeAlias_normalisedName_key', 'Employee_employeeCode_key',
      'Sprint_code_key', 'Sprint_number_key', 'ImportChange_batchId_seq_key',
    ]) {
      expect(names).toContain(idx);
    }
  });

  it('creates lookup indexes', async () => {
    const rows = await t.db.$queryRawUnsafe<{ name: string }[]>("SELECT name FROM sqlite_master WHERE type = 'index'");
    const names = rows.map((r) => r.name);
    for (const idx of ['Score_sprintId_idx', 'Employee_normalisedName_idx', 'AuditEvent_action_at_idx', 'ImportBatch_status_createdAt_idx']) {
      expect(names).toContain(idx);
    }
  });

  it('does not make Employee.normalisedName unique (EmployeeAlias is the namespace, ADR-018)', async () => {
    const rows = await t.db.$queryRawUnsafe<{ name: string }[]>(
      "SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'Employee_normalisedName_key'",
    );
    expect(rows).toHaveLength(0);
  });
});

describe('connection pragmas (E-00-03 AC-2)', () => {
  it('runs in WAL mode with foreign keys enforced', async () => {
    const [mode] = await t.db.$queryRawUnsafe<{ journal_mode: string }[]>('PRAGMA journal_mode');
    const [fk] = await t.db.$queryRawUnsafe<{ foreign_keys: bigint | number }[]>('PRAGMA foreign_keys');
    expect(mode?.journal_mode).toBe('wal');
    expect(Number(fk?.foreign_keys)).toBe(1);
  });

  it('rejects a score that references a missing employee', async () => {
    const sprint = await t.db.sprint.create({ data: { code: 'S900', number: 900 } });
    await expect(
      t.db.score.create({ data: { employeeId: 'missing', sprintId: sprint.id, status: 'RUN' } }),
    ).rejects.toThrow();
    await t.db.sprint.delete({ where: { id: sprint.id } });
  });
});

describe('seed (E-00-03 AC-3)', () => {
  it('creates designations with canonical aliases, system state and default settings', async () => {
    const first = await seedReferenceData(t.db);
    expect(first).toEqual({ designationsCreated: 4, systemStateCreated: true, settingsCreated: true });

    const designations = await t.db.designation.findMany({ orderBy: { sortOrder: 'asc' }, include: { aliases: true } });
    expect(designations.map((d) => [d.name, d.sortOrder])).toEqual([['Team Lead', 1], ['SSE', 2], ['SE', 3], ['ASE', 4]]);
    expect(designations.every((d) => d.aliases.length === 1 && d.aliases[0]?.source === 'CANONICAL')).toBe(true);
    expect(designations[0]?.aliases[0]?.normalisedName).toBe('team lead');

    const state = await t.db.systemState.findUniqueOrThrow({ where: { id: 1 } });
    expect([state.scoreRevision, state.settingsRevision]).toEqual([0, 0]);
    const settings = await t.db.appSettings.findUniqueOrThrow({ where: { id: 1 } });
    expect(settings.data).toEqual(DEFAULT_KPI_SETTINGS);
  });

  it('is idempotent', async () => {
    const second = await seedReferenceData(t.db);
    expect(second).toEqual({ designationsCreated: 0, systemStateCreated: false, settingsCreated: false });
    expect(await t.db.designation.count()).toBe(4);
    expect(await t.db.designationAlias.count()).toBe(4);
    expect(await t.db.systemState.count()).toBe(1);
    expect(await t.db.appSettings.count()).toBe(1);
  });
});
