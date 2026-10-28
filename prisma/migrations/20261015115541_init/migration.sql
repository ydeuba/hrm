-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "passwordChangedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" DATETIME
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "userAgent" TEXT,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AdminUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LoginThrottle" (
    "email" TEXT NOT NULL PRIMARY KEY,
    "failures" INTEGER NOT NULL DEFAULT 0,
    "windowStart" DATETIME NOT NULL,
    "lockedUntil" DATETIME
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TeamAlias" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "normalisedName" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    CONSTRAINT "TeamAlias_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Designation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DesignationAlias" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "normalisedName" TEXT NOT NULL,
    "designationId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    CONSTRAINT "DesignationAlias_designationId_fkey" FOREIGN KEY ("designationId") REFERENCES "Designation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Sprint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "displayName" TEXT NOT NULL,
    "normalisedName" TEXT NOT NULL,
    "employeeCode" TEXT,
    "email" TEXT,
    "joiningDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "teamId" TEXT NOT NULL,
    "designationId" TEXT NOT NULL,
    "teamLocked" BOOLEAN NOT NULL DEFAULT false,
    "designationLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Employee_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Employee_designationId_fkey" FOREIGN KEY ("designationId") REFERENCES "Designation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmployeeAlias" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "normalisedName" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    CONSTRAINT "EmployeeAlias_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Score" (
    "employeeId" TEXT NOT NULL,
    "sprintId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "valueCenti" INTEGER,
    "sourceBatchId" TEXT,
    "updatedAt" DATETIME NOT NULL,

    PRIMARY KEY ("employeeId", "sprintId"),
    CONSTRAINT "Score_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Score_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "Sprint" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Score_sourceBatchId_fkey" FOREIGN KEY ("sourceBatchId") REFERENCES "ImportBatch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileName" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "fileKey" TEXT,
    "fileSize" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "baseRevision" INTEGER NOT NULL,
    "commitRevision" INTEGER,
    "sheetName" TEXT NOT NULL,
    "headerRow" INTEGER NOT NULL,
    "sprints" JSONB NOT NULL,
    "parsed" JSONB,
    "summary" JSONB NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "committedAt" DATETIME,
    "rolledBackAt" DATETIME,
    CONSTRAINT "ImportBatch_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "AdminUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImportIssue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "row" INTEGER,
    "column" TEXT,
    "employeeName" TEXT,
    "message" TEXT NOT NULL,
    "sheetValue" REAL,
    "computedValue" REAL,
    CONSTRAINT "ImportIssue_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ImportBatch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImportChange" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "entity" TEXT NOT NULL,
    "entityKey" TEXT NOT NULL,
    "op" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB NOT NULL,
    CONSTRAINT "ImportChange_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ImportBatch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "data" JSONB NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT,
    CONSTRAINT "AppSettings_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "AdminUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SystemState" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "scoreRevision" INTEGER NOT NULL DEFAULT 0,
    "settingsRevision" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "meta" JSONB,
    CONSTRAINT "AuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "AdminUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "TeamAlias_normalisedName_key" ON "TeamAlias"("normalisedName");

-- CreateIndex
CREATE INDEX "TeamAlias_teamId_idx" ON "TeamAlias"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "DesignationAlias_normalisedName_key" ON "DesignationAlias"("normalisedName");

-- CreateIndex
CREATE INDEX "DesignationAlias_designationId_idx" ON "DesignationAlias"("designationId");

-- CreateIndex
CREATE UNIQUE INDEX "Sprint_code_key" ON "Sprint"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Sprint_number_key" ON "Sprint"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeCode_key" ON "Employee"("employeeCode");

-- CreateIndex
CREATE INDEX "Employee_normalisedName_idx" ON "Employee"("normalisedName");

-- CreateIndex
CREATE INDEX "Employee_teamId_idx" ON "Employee"("teamId");

-- CreateIndex
CREATE INDEX "Employee_designationId_idx" ON "Employee"("designationId");

-- CreateIndex
CREATE INDEX "Employee_status_idx" ON "Employee"("status");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeAlias_normalisedName_key" ON "EmployeeAlias"("normalisedName");

-- CreateIndex
CREATE INDEX "EmployeeAlias_employeeId_idx" ON "EmployeeAlias"("employeeId");

-- CreateIndex
CREATE INDEX "Score_sprintId_idx" ON "Score"("sprintId");

-- CreateIndex
CREATE INDEX "Score_sourceBatchId_idx" ON "Score"("sourceBatchId");

-- CreateIndex
CREATE INDEX "ImportBatch_status_createdAt_idx" ON "ImportBatch"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ImportBatch_fileHash_idx" ON "ImportBatch"("fileHash");

-- CreateIndex
CREATE INDEX "ImportIssue_batchId_severity_idx" ON "ImportIssue"("batchId", "severity");

-- CreateIndex
CREATE INDEX "ImportChange_entity_entityKey_idx" ON "ImportChange"("entity", "entityKey");

-- CreateIndex
CREATE UNIQUE INDEX "ImportChange_batchId_seq_key" ON "ImportChange"("batchId", "seq");

-- CreateIndex
CREATE INDEX "AuditEvent_at_idx" ON "AuditEvent"("at");

-- CreateIndex
CREATE INDEX "AuditEvent_action_at_idx" ON "AuditEvent"("action", "at");

-- CreateIndex
CREATE INDEX "AuditEvent_entity_entityId_idx" ON "AuditEvent"("entity", "entityId");
