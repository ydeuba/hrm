import 'server-only';
import type { AuditLog } from '@/application/ports/audit-log';
import type { Clock } from '@/application/ports/clock';
import { ListAuditEvents } from '@/application/use-cases/audit/list-audit-events';
import { CreateBackup } from '@/application/use-cases/backup/create-backup';
import { ChangePassword } from '@/application/use-cases/auth/change-password';
import { CreateInitialAdmin } from '@/application/use-cases/auth/create-initial-admin';
import { Login } from '@/application/use-cases/auth/login';
import { Logout } from '@/application/use-cases/auth/logout';
import { ValidateSession } from '@/application/use-cases/auth/validate-session';
import { CorrectScore, EraseEmployee, MergeEmployees } from '@/application/use-cases/employees/employee-data-use-cases';
import { GetEmployee, ListEmployees, ManageLabels, UpdateEmployee } from '@/application/use-cases/employees/employee-use-cases';
import { CommitImport } from '@/application/use-cases/imports/commit-import';
import { DiscardImport } from '@/application/use-cases/imports/discard-import';
import { GetImportFile } from '@/application/use-cases/imports/get-import-file';
import { RollbackImport } from '@/application/use-cases/imports/rollback-import';
import { GetImport } from '@/application/use-cases/imports/get-import';
import { ListImports } from '@/application/use-cases/imports/list-imports';
import { PreviewImport } from '@/application/use-cases/imports/preview-import';
import { ReceiveUpload } from '@/application/use-cases/imports/receive-upload';
import { GetDashboardDataset } from '@/application/use-cases/kpi/get-dashboard-dataset';
import { GetEngineerProfile } from '@/application/use-cases/kpi/get-engineer-profile';
import { GetGroupSummaries } from '@/application/use-cases/kpi/get-group-summaries';
import { GetRankings } from '@/application/use-cases/kpi/get-rankings';
import { GetTeamAppraisals } from '@/application/use-cases/kpi/get-team-appraisals';
import { ExportKpi } from '@/application/use-cases/exports/export-use-cases';
import { ManageSettings } from '@/application/use-cases/settings/settings-use-cases';
import { ManageSprints } from '@/application/use-cases/sprints/manage-sprints';
import { PrismaAuditLog } from './audit/prisma-audit-log';
import { PrismaAuditReader } from './audit/prisma-audit-reader';
import { SqliteBackupArchiver } from './backup/sqlite-backup-archiver';
import { Argon2PasswordHasher } from './auth/argon2-password-hasher';
import { CryptoTokenService } from './auth/crypto-token-service';
import { systemClock } from './clock/system-clock';
import { createPrismaClient, type Db } from './db/prisma';
import {
  PrismaAdminUserRepository,
  PrismaLoginThrottleRepository,
  PrismaSessionStore,
} from './db/repositories/prisma-auth-repositories';
import { PrismaEmployeeRepository } from './db/repositories/prisma-employee-repository';
import { PrismaEmployeeDataRepository } from './db/repositories/prisma-employee-data-repository';
import { PrismaEmployeeWriter } from './db/repositories/prisma-employee-writer';
import { PrismaLabelRepository } from './db/repositories/prisma-label-repository';
import { PrismaImportBatchRepository } from './db/repositories/prisma-import-batch-repository';
import { PrismaImportCommitter } from './db/repositories/prisma-import-committer';
import { PrismaImportRollbacker } from './db/repositories/prisma-import-rollbacker';
import { PrismaImportStateLoader } from './db/repositories/prisma-import-state-loader';
import { PrismaKpiReadRepository } from './db/repositories/prisma-kpi-read-repository';
import { PrismaSettingsRepository } from './db/repositories/prisma-settings-repository';
import { PrismaSprintRepository } from './db/repositories/prisma-sprint-repository';
import { createSqliteScoreReader, type FastScoreReader } from './db/sqlite-score-reader';
import { SheetJsReader } from './excel/sheetjs-reader';
import { SheetJsWriter } from './excel/sheetjs-writer';
import { getEnv, type Env } from './env';
import { LocalFileStore, sha256Hasher } from './files/local-file-store';
import { createLogger, type Logger } from './logger';

/** lastSeenAt is written at most every 5 minutes (ADR-005). */
const SESSION_TOUCH_THROTTLE_MS = 5 * 60_000;
/** Upload ZIP part limit (ADR-008). */
const MAX_ZIP_ENTRIES = 200;

export interface UseCases {
  readonly login: Login;
  readonly validateSession: ValidateSession;
  readonly logout: Logout;
  readonly createInitialAdmin: CreateInitialAdmin;
  readonly changePassword: ChangePassword;
  readonly receiveUpload: ReceiveUpload;
  readonly previewImport: PreviewImport;
  readonly getImport: GetImport;
  readonly listImports: ListImports;
  readonly commitImport: CommitImport;
  readonly discardImport: DiscardImport;
  readonly rollbackImport: RollbackImport;
  readonly getImportFile: GetImportFile;
  readonly getDashboardDataset: GetDashboardDataset;
  readonly getRankings: GetRankings;
  readonly getGroupSummaries: GetGroupSummaries;
  readonly getEngineerProfile: GetEngineerProfile;
  readonly getTeamAppraisals: GetTeamAppraisals;
  readonly listEmployees: ListEmployees;
  readonly getEmployee: GetEmployee;
  readonly updateEmployee: UpdateEmployee;
  readonly manageLabels: ManageLabels;
  readonly mergeEmployees: MergeEmployees;
  readonly correctScore: CorrectScore;
  readonly eraseEmployee: EraseEmployee;
  readonly manageSettings: ManageSettings;
  readonly manageSprints: ManageSprints;
  readonly exportKpi: ExportKpi;
  readonly createBackup: CreateBackup;
  readonly listAuditEvents: ListAuditEvents;
}

/** Composition root (ADR-002): the only place that binds ports to adapters. */
export interface Container {
  readonly env: Env;
  readonly db: Db;
  readonly logger: Logger;
  readonly clock: Clock;
  readonly auditLog: AuditLog;
  readonly useCases: UseCases;
  /** Release every connection (Prisma + read-only SQLite fast path). */
  close(): Promise<void>;
}

interface Shared {
  readonly env: Env;
  readonly db: Db;
  readonly clock: Clock;
  readonly audit: AuditLog;
  readonly fastReader: FastScoreReader | null;
}

function authUseCases({ env, db, clock, audit }: Shared) {
  const users = new PrismaAdminUserRepository(db);
  const sessions = new PrismaSessionStore(db);
  const hasher = new Argon2PasswordHasher();
  const tokens = new CryptoTokenService();
  return {
    login: new Login({
      users, sessions, throttle: new PrismaLoginThrottleRepository(db), hasher, tokens, audit, clock,
      absoluteSessionMs: env.SESSION_ABSOLUTE_HOURS * 3_600_000,
    }),
    validateSession: new ValidateSession({
      sessions, tokens, clock,
      policy: { idleMs: env.SESSION_IDLE_MINUTES * 60_000, touchThrottleMs: SESSION_TOUCH_THROTTLE_MS },
    }),
    logout: new Logout({ sessions, audit }),
    createInitialAdmin: new CreateInitialAdmin({ users, hasher }),
    changePassword: new ChangePassword({ users, sessions, hasher, audit, clock }),
  };
}

function importUseCases({ env, db, clock, audit, fastReader }: Shared) {
  const batches = new PrismaImportBatchRepository(db);
  const state = new PrismaImportStateLoader(db);
  const settings = new PrismaSettingsRepository(db);
  const files = new LocalFileStore(env.DATA_DIR);
  const receiveUpload = new ReceiveUpload({
    files,
    hasher: sha256Hasher,
    limits: { maxBytes: env.UPLOAD_MAX_BYTES, maxUncompressedBytes: env.UPLOAD_MAX_UNCOMPRESSED_BYTES, maxZipEntries: MAX_ZIP_ENTRIES },
  });
  return {
    receiveUpload,
    previewImport: new PreviewImport({ receiveUpload, reader: new SheetJsReader(), batches, state, settings, audit, clock, files }),
    getImport: new GetImport({ batches, clock }),
    listImports: new ListImports({ batches, state, settings, clock }),
    commitImport: new CommitImport({ batches, state, committer: new PrismaImportCommitter(db), settings, clock }),
    discardImport: new DiscardImport({ batches, audit }),
    rollbackImport: new RollbackImport({ batches, rollbacker: new PrismaImportRollbacker(db), clock }),
    getImportFile: new GetImportFile({ batches, files }),
    getDashboardDataset: new GetDashboardDataset({
      kpi: new PrismaKpiReadRepository(db, fastReader),
      settings,
      batches,
      sprints: new PrismaSprintRepository(db),
    }),
  };
}

function kpiUseCases({ db, fastReader }: Shared) {
  const kpi = new PrismaKpiReadRepository(db, fastReader);
  const settings = new PrismaSettingsRepository(db);
  const employees = new PrismaEmployeeRepository(db);
  const getEngineerProfile = new GetEngineerProfile({ kpi, settings, employees, sprints: new PrismaSprintRepository(db) });
  return {
    getRankings: new GetRankings({ kpi, settings }),
    getGroupSummaries: new GetGroupSummaries({ kpi, settings }),
    getEngineerProfile,
    getTeamAppraisals: new GetTeamAppraisals({ labels: new PrismaLabelRepository(db), employees, profile: getEngineerProfile }),
  };
}

function employeeUseCases({ env, db, audit }: Shared) {
  const employees = new PrismaEmployeeRepository(db);
  const data = new PrismaEmployeeDataRepository(db);
  return {
    mergeEmployees: new MergeEmployees({ data, employees, audit }),
    correctScore: new CorrectScore({ data, audit }),
    eraseEmployee: new EraseEmployee({ data, employees, files: new LocalFileStore(env.DATA_DIR), audit }),
    listEmployees: new ListEmployees({ employees }),
    getEmployee: new GetEmployee({ employees }),
    updateEmployee: new UpdateEmployee({ writer: new PrismaEmployeeWriter(db), audit }),
    manageLabels: new ManageLabels({ labels: new PrismaLabelRepository(db), audit }),
  };
}

function settingsUseCases({ db, audit }: Shared) {
  const repo = new PrismaSettingsRepository(db);
  return { manageSettings: new ManageSettings({ repo, writer: repo, audit }), manageSprints: new ManageSprints({ sprints: new PrismaSprintRepository(db), audit }) };
}

export async function createContainer(env: Env, overrides: { clock?: Clock } = {}): Promise<Container> {
  const db = await createPrismaClient(env.DATABASE_URL);
  const clock = overrides.clock ?? systemClock;
  const audit = new PrismaAuditLog(db, clock);
  const fastReader = createSqliteScoreReader(env.DATABASE_URL);
  const shared: Shared = { env, db, clock, audit, fastReader };
  const base = { ...authUseCases(shared), ...importUseCases(shared), ...kpiUseCases(shared), ...employeeUseCases(shared), ...settingsUseCases(shared) };
  const exportKpi = new ExportKpi({ dataset: base.getDashboardDataset, rankings: base.getRankings, writer: new SheetJsWriter(), clock });
  const createBackup = new CreateBackup({ archiver: new SqliteBackupArchiver(db, env.DATA_DIR, clock), audit, clock });
  const listAuditEvents = new ListAuditEvents({ reader: new PrismaAuditReader(db) });
  const useCases: UseCases = { ...base, exportKpi, createBackup, listAuditEvents };
  return {
    env, db, clock, logger: createLogger(env.LOG_LEVEL), auditLog: audit, useCases,
    async close() {
      fastReader?.close();
      await db.$disconnect();
    },
  };
}

const globalKey = Symbol.for('hrm.container');
type GlobalWithContainer = typeof globalThis & { [globalKey]?: Promise<Container> };

/** Lazily-built singleton, memoised on globalThis so dev hot-reloads reuse one DB connection. */
export function getContainer(): Promise<Container> {
  const g = globalThis as GlobalWithContainer;
  g[globalKey] ??= Promise.resolve()
    .then(() => createContainer(getEnv()))
    .catch((error: unknown) => {
      g[globalKey] = undefined;
      throw error;
    });
  return g[globalKey];
}
