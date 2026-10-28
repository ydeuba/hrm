# Architecture Views — hrm

Companion to [architecture.md](architecture.md). Four AAID views: System Map, Module Map, Data Flow, Dependency Graph.

---

## 1. System Map

The system boundary, external actors and integrations. In v1 there are no live integrations; data enters only through file upload.

```mermaid
graph LR
  subgraph People
    HR["HR Admin<br/>(sole user)"]
    MGMT["Management<br/>(consumes PDFs / exports)"]
    TL["Team Leads<br/>(maintain team workbooks)"]
  end

  subgraph Offline["Outside the system (manual)"]
    TEAMXLS["Per-team workbooks<br/>(Team Bravo.xlsx, …)"]
    MASTER["KPI Master Sheet.xlsx<br/>Compile Sheet"]
  end

  subgraph Boundary["hrm — Next.js app on the HR laptop (later: server)"]
    APP["hrm web app<br/>UI + /api/v1"]
    DATA[("./data<br/>hrm.db · uploads · backups")]
  end

  BROWSER["Browser print dialog<br/>→ PDF"]
  EXCEL["Excel / CSV export files"]

  TL -- "enter sprint scores" --> TEAMXLS
  TEAMXLS -- "external links" --> MASTER
  HR -- "compiles / receives" --> MASTER
  HR -- "uploads .xlsx (HTTPS/HTTP, session)" --> APP
  APP <--> DATA
  APP -- "print views" --> BROWSER
  APP -- "download" --> EXCEL
  BROWSER -- "shared in meetings" --> MGMT
  EXCEL -- "further analysis" --> MGMT

  FUTURE["Future (out of scope v1):<br/>Zoho Sprints · Jira · M365 SSO · PostgreSQL server"]
  APP -. "ports ready" .-> FUTURE
```

---

## 2. Module Map

Internal modules by Clean Architecture layer and their responsibilities. Arrows show allowed `import` direction.

```mermaid
graph TB
  subgraph Presentation["Presentation — src/app, src/components, proxy.ts"]
    P_GATE["proxy.ts<br/>cookie presence gate"]
    P_DAL["_lib/dal.ts · with-handler.ts<br/>session verify · Origin check · Zod · error map"]
    P_PAGES["Pages: dashboard · employees · rankings<br/>imports · settings · audit · account · print"]
    P_API["Route Handlers /api/v1/*"]
    P_UI["Client UI: DashboardClient · charts/*<br/>ImportWizard · EngineerTable · ProfileModal"]
  end

  subgraph Application["Application — src/application"]
    A_AUTH["use-cases/auth"]
    A_IMP["use-cases/imports"]
    A_KPI["use-cases/kpi"]
    A_EMP["use-cases/employees · reference"]
    A_OPS["use-cases/settings · exports · audit · backup"]
    A_CON["contracts/* (Zod DTOs)"]
    A_PORT["ports/* (interfaces)"]
  end

  subgraph Domain["Domain — src/domain (pure TS, also bundled to client)"]
    D_KPI["kpi/<br/>metrics · bands · momentum · ranking<br/>groups · trend · window · dashboard · format"]
    D_IMP["import/<br/>cell-parser · header-locator · name-normaliser<br/>master-sheet · validator · diff"]
    D_ENT["shared/ · employee/ · settings/<br/>Result · errors · SprintCode · KpiSettings"]
  end

  subgraph Infrastructure["Infrastructure — src/infrastructure (server-only)"]
    I_DB["db/ Prisma client · repositories · UnitOfWork"]
    I_XLS["excel/ SheetJS reader & writer"]
    I_AUTH["auth/ argon2 · session store · token"]
    I_FS["files/ · backup/ · clock/ · env.ts"]
    I_CONT["container.ts (composition root)"]
  end

  P_PAGES --> P_DAL
  P_API --> P_DAL
  P_PAGES --> I_CONT
  P_API --> I_CONT
  P_PAGES --> A_CON
  P_API --> A_CON
  P_UI --> A_CON
  P_UI --> D_KPI

  A_AUTH & A_IMP & A_KPI & A_EMP & A_OPS --> A_PORT
  A_IMP --> D_IMP
  A_IMP --> D_KPI
  A_KPI --> D_KPI
  A_EMP --> D_ENT
  A_OPS --> D_KPI
  D_KPI --> D_ENT
  D_IMP --> D_ENT

  I_CONT --> A_AUTH & A_IMP & A_KPI & A_EMP & A_OPS
  I_DB -. implements .-> A_PORT
  I_XLS -. implements .-> A_PORT
  I_AUTH -. implements .-> A_PORT
  I_FS -. implements .-> A_PORT
```

| Module | Responsibility |
|---|---|
| `domain/kpi` | Every KPI formula: per-engineer metrics, bands, momentum, rankings, weighted group averages, sprint trend, last-N window, dashboard composition, number formatting |
| `domain/import` | Turn a raw cell grid into typed rows; detect the header; parse RUN/N/A; normalise names; validate; diff against current state |
| `application/use-cases/*` | Orchestrate one user intent each, using transactions, audit, ports and domain functions |
| `application/contracts` | Zod request/response schemas shared by server handlers and client fetchers |
| `infrastructure/db` | Prisma persistence, the matrix pivot query and transactions |
| `infrastructure/excel` | Safe SheetJS read (cached values, magic bytes) and write (injection escaping) |
| `infrastructure/auth` | argon2id hashing, DB sessions, token generation |
| `presentation` | Routing, auth gates, HTTP mapping, React UI, charts, print layouts |

---

## 3. Data Flow

### 3a. Import: upload → preview → commit (→ rollback)

```mermaid
sequenceDiagram
  autonumber
  actor HR as HR Admin
  participant UI as ImportWizard (client)
  participant RH as /api/v1/imports (Route Handler)
  participant PI as PreviewImport (use case)
  participant XR as SheetJsMasterSheetReader
  participant DI as domain/import (interpret · validate · diff)
  participant FS as LocalFileStore
  participant DB as Prisma / SQLite
  participant CI as CommitImport (use case)

  HR->>UI: choose KPI Master Sheet.xlsx
  UI->>RH: POST multipart (cookie, Origin)
  RH->>RH: requireApiSession · size ≤5MB · ext/magic bytes
  RH->>PI: execute({fileName, bytes, actorId})
  PI->>FS: put uploads/<sha256>.xlsx
  PI->>XR: read(bytes) → RawGrid per sheet (cached values only)
  PI->>DI: interpretMasterSheet("Compile Sheet ") → rows + issues
  PI->>DB: load CurrentState (employees+aliases by normalised name, scores for those keys), revision
  PI->>DI: validate() + diff(sheet, current, settings)
  PI->>DB: insert ImportBatch(PREVIEW, baseRevision) + ImportIssue[] + AuditEvent(IMPORT_PREVIEW)
  PI-->>RH: ImportPreviewDto
  RH-->>UI: 201 preview (summary, changes, warnings)
  HR->>UI: review and click "Confirm import"
  UI->>RH: POST /imports/{id}/commit {merges}
  RH->>CI: execute
  CI->>DB: BEGIN TRANSACTION
  CI->>DB: UPDATE SystemState SET scoreRevision=base+1 WHERE scoreRevision=base (0 rows → 409 re-preview)
  CI->>DI: recompute diff from stored parsed rows
  CI->>DB: resolve names via Team/Designation/EmployeeAlias · ensure missing · upsert Employees (skip locked fields) · upsert Scores
  CI->>DB: write ImportChange journal (before/after) per mutation
  CI->>DB: batch=COMMITTED, commitRevision=base+1, clear parsed JSON, AuditEvent(IMPORT_COMMIT)
  CI->>DB: COMMIT
  CI-->>UI: 200 summary → redirect to /dashboard
  Note over CI,DB: Rollback = same transaction pattern, replaying ImportChange in reverse seq,<br/>allowed only for the latest batch while scoreRevision == commitRevision (settings changes don't block)
```

### 3b. Dashboard: request → compute → render → filter

```mermaid
sequenceDiagram
  autonumber
  actor HR as HR Admin
  participant PX as proxy.ts
  participant PG as /dashboard (Server Component)
  participant DAL as requireSession()
  participant DS as GetDashboardDataset (use case)
  participant CACHE as in-proc LRU (revision,range)
  participant DB as Prisma / SQLite
  participant KPI as domain/kpi
  participant DC as DashboardClient (browser)

  HR->>PX: GET /dashboard?team=DevOps&from=S122&to=S138
  PX->>PX: cookie present? else redirect /login
  PX->>PG: continue
  PG->>DAL: verify token hash, idle/absolute expiry, touch lastSeenAt
  PG->>DS: execute({from,to,includeInactive:false})
  DS->>CACHE: lookup (revision, range)
  alt cache miss
    DS->>DB: Score⋈Sprint⋈Employee where sprint.number in range
    DS->>KPI: computeEngineerMetrics + rank(overall) per engineer
    DS->>CACHE: store
  end
  DS-->>PG: KpiDatasetDto (matrix, overall ranks, settings, dataCheck)
  PG-->>HR: HTML + RSC payload (dataset as props)
  HR->>DC: hydrate
  DC->>KPI: computeDashboard(dataset, filters from URL, settings)
  DC-->>HR: cards · 5 charts · table
  HR->>DC: change filter / sort / search
  DC->>KPI: computeDashboard(...) in useMemo (≤300 ms, no network)
  DC->>DC: history.replaceState(URL query)
  HR->>DC: change sprint range
  DC->>PG: GET /api/v1/kpi/dataset?from&to (If-None-Match: revision)
```

### 3c. Authentication

```mermaid
flowchart LR
  A[POST /api/v1/auth/login] --> B{Origin same-host?}
  B -- no --> X1[403 CSRF_ORIGIN_MISMATCH]
  B -- yes --> C{LoginThrottle.lockedUntil<br/>> now?}
  C -- yes --> X2[429 LOCKED_OUT<br/>not verified, not counted]
  C -- no --> D[find AdminUser by email<br/>unknown → dummy hash]
  D --> E{argon2id verify}
  E -- fail --> F[failures++ in 15-min window<br/>5th → lockedUntil = now+15m + audit AUTH_LOCKOUT<br/>audit AUTH_LOGIN_FAIL] --> X3[401 INVALID_CREDENTIALS]
  E -- ok --> G[token = 32 random bytes<br/>store SHA-256 in Session<br/>expiresAt = now+12h]
  G --> H[Set-Cookie hrm_session<br/>httpOnly · SameSite=Lax · Secure on HTTPS]
  H --> I[audit AUTH_LOGIN_OK → 200]
```

---

## 4. Dependency Graph

Libraries and services, and where coupling concentrates. Thick edges are high-coupling hotspots; dotted edges are dev/test only.

```mermaid
graph LR
  subgraph Runtime["Runtime dependencies"]
    NEXT["next (latest stable major)<br/>react 19 · react-dom"]
    PRISMA["prisma + @prisma/client<br/>+ SQLite driver adapter"]
    SHEETJS["xlsx (SheetJS CE ≥0.20.3<br/>from cdn.sheetjs.com)"]
    ARGON["@node-rs/argon2"]
    ZOD["zod"]
    CHART["chart.js 4 + react-chartjs-2"]
    TW["tailwindcss v4"]
    ARCH["archiver (backup zip)"]
    PINO["pino (logging)"]
    SO["server-only"]
  end

  subgraph Dev["Dev / test"]
    VITEST["vitest + @vitest/coverage-v8"]
    PW["@playwright/test"]
    ESL["eslint + typescript-eslint<br/>+ eslint-plugin-boundaries"]
    TS["typescript (strict)"]
  end

  DOMAIN["src/domain<br/>(0 deps)"]
  APPL["src/application"]
  INFRA["src/infrastructure"]
  PRES["src/app + src/components"]

  PRES ==>|"framework coupling"| NEXT
  PRES --> CHART
  PRES --> TW
  PRES --> ZOD
  PRES --> APPL
  PRES --> DOMAIN
  APPL --> ZOD
  APPL --> DOMAIN
  INFRA ==>|"persistence coupling"| PRISMA
  INFRA --> SHEETJS
  INFRA --> ARGON
  INFRA --> ARCH
  INFRA --> PINO
  INFRA --> SO
  INFRA --> APPL
  INFRA --> DOMAIN

  VITEST -.-> DOMAIN
  VITEST -.-> APPL
  VITEST -.-> INFRA
  PW -.-> PRES
  ESL -.->|"enforces layer rules"| DOMAIN
```

**Coupling hotspots and mitigations**

| Hotspot | Risk | Mitigation |
|---|---|---|
| `next` in presentation | Major-version churn (middleware → proxy rename, caching defaults) | Business logic kept out of presentation; thin route handlers via `withHandler` |
| `prisma` in infrastructure | Engine/adapter changes between majors; SQLite ↔ PostgreSQL differences | Repositories behind ports; integer score storage (ADR-004); no raw SQL except the backup provider |
| `xlsx` (SheetJS) | Security advisories on the npm 0.18.x line; distribution off the npm registry | CDN ≥0.20.3 pinned with integrity hash; single adapter behind `SpreadsheetReader`/`Writer` |
| `src/domain/kpi` | Central to every number (fan-in from client, use cases, exports) | Zero dependencies, 100% branch coverage, golden-fixture tests |
| `@node-rs/argon2` | Native binary per platform | Prebuilt for win32/linux/darwin; fallback to `bcryptjs` behind `PasswordHasher` if a target lacks a prebuild |
