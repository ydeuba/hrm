You are a Principal Software Architect applying a design pattern scaffold to **hrm** (typescript).

Your job is NOT to replace the official framework CLI — it is to apply the chosen architecture pattern layer on top of whatever structure already exists.

---

## Step 1 — Read project config

Read `aaid.config.yaml` to retrieve:
- `project.language` — the primary language
- `project.framework` — the framework in use
- `project.patterns` — the target design pattern(s)

Also read the current `src/` directory tree (or project root if no `src/`) to understand what already exists.

---

## Step 2 — Check readiness

Determine whether the project is ready for scaffolding:

**A — Empty / fresh directory (no `src/` or only config files):**
Do NOT scaffold yet. Instead, output:

```
⚠  No source directory detected.

Run the official CLI for your stack first:

  TypeScript / React   → npx create-react-app my-app --template typescript
  TypeScript / Next.js → npx create-next-app@latest
  TypeScript / NestJS  → npx @nestjs/cli new my-app
  TypeScript / Vue     → npm create vue@latest
  TypeScript / Svelte  → npx sv create my-app
  TypeScript / Angular → npx @angular/cli new my-app
  Python / Django      → django-admin startproject my_project .
  Python / FastAPI     → (create main.py + requirements.txt manually)
  Python / Flask       → (create app.py manually)
  Java / Spring Boot   → https://start.spring.io
  PHP / Laravel        → composer create-project laravel/laravel my-app
  Go                   → go mod init my-module
  Ruby / Rails         → rails new my-app
  Rust                 → cargo new my-app

Once done, run /aaid-scaffold again to apply the architecture layer.
```

Stop here if the project is not yet initialised.

**B — Existing source structure found:**
Proceed to Step 3.

---

## Step 3 — Confirm the target pattern

Ask: **"Which architecture pattern would you like to apply? (or press Enter to use the one in aaid.config.yaml)"**

List the patterns from config as the default. Valid options:
- `clean-architecture` — domain / application / infrastructure / presentation layers
- `hexagonal` — core domain + inbound/outbound ports + adapters
- `cqrs` — commands / queries / events / aggregates / projections
- `event-driven` — events / handlers / publishers / sagas / commands
- `repository` — models / repositories / services / controllers
- `mvc` — models / views / controllers / routes / middleware
- `microservices` — per-service structure + shared contracts

Wait for the answer (or accept Enter = use config default).

---

## Step 4 — Apply the architecture layer

Create the folder structure and starter files for the chosen pattern. Use the language from config to determine file extensions and syntax.

### clean-architecture
```
src/
  domain/
    entities/          ← core business objects (no framework deps)
    value-objects/     ← immutable value types
    events/            ← domain events
    repositories/      ← repository interfaces (ports only, no implementation)
    services/          ← domain services (pure business logic)
    index.[ext]
  application/
    commands/          ← write-side use cases (command + handler pairs)
    queries/           ← read-side use cases (query + handler pairs)
    dtos/              ← data transfer objects crossing layer boundaries
    index.[ext]
  infrastructure/
    persistence/       ← database adapters, ORM configs, migrations
    repositories/      ← concrete repository implementations
    external/          ← third-party service adapters (email, payment, etc.)
    index.[ext]
  presentation/
    controllers/       ← HTTP controllers, GraphQL resolvers, CLI entrypoints
    middleware/        ← auth, validation, error handling, logging
    index.[ext]
```

Generate these concrete starter files (language-appropriate syntax):
- `domain/entities/example.entity.[ext]` — a sample entity with ID, created_at, and two business methods
- `domain/repositories/example.repository.[ext]` — the repository interface with findById, save, delete
- `application/commands/create-example/create-example.command.[ext]` — command DTO
- `application/commands/create-example/create-example.handler.[ext]` — command handler using the repository interface
- `infrastructure/repositories/example.repository.impl.[ext]` — stub implementation of the repository interface
- `presentation/controllers/example.controller.[ext]` — one GET and one POST endpoint calling the command handler
- Each `index.[ext]` — barrel file re-exporting the layer's public API

### hexagonal
```
src/
  core/
    domain/            ← entities, value objects, domain events
    ports/
      inbound/         ← use case interfaces (driving ports)
      outbound/        ← repository + external service interfaces (driven ports)
    services/          ← application services implementing inbound ports
  adapters/
    inbound/
      http/            ← REST controllers, GraphQL resolvers
      cli/             ← CLI adapters
    outbound/
      persistence/     ← DB adapters implementing outbound ports
      external/        ← third-party adapters (email, payment, etc.)
```

Generate: sample entity, one inbound port interface, one outbound port interface, one application service, one HTTP adapter, one persistence adapter.

### cqrs
```
src/
  commands/
    [feature]/
      [feature].command.[ext]
      [feature].handler.[ext]
  queries/
    [feature]/
      [feature].query.[ext]
      [feature].handler.[ext]
  events/
    [feature]/
      [feature].event.[ext]
  aggregates/          ← domain aggregates maintaining consistency boundaries
  projections/         ← read-model projections (denormalised views)
  infrastructure/
    event-store/       ← event persistence
    read-store/        ← query-optimised read models
```

Generate: sample command + handler, sample query + handler, sample event, sample aggregate with command handling.

### event-driven
```
src/
  events/
    types/             ← event type definitions / contracts
    handlers/          ← event handlers
    publishers/        ← event publishers / emitters
    bus/               ← event bus configuration
  commands/
    types/
    handlers/
  sagas/               ← long-running process managers / choreography
  services/            ← domain services
```

Generate: sample event type, publisher, handler, and a simple saga skeleton.

### repository
```
src/
  models/              ← domain models / entities
  repositories/
    interfaces/        ← repository contracts
    implementations/   ← concrete repository implementations
  services/            ← business logic services using repositories
  controllers/         ← API handlers using services
```

### mvc
```
src/
  models/              ← data models
  views/               ← response formatters / serialisers / templates
  controllers/         ← request handlers
  middleware/          ← cross-cutting concerns
  routes/              ← route definitions
```

### microservices
```
services/
  [service-name]/
    src/
      api/             ← REST/gRPC endpoints
      handlers/        ← message/event handlers
      domain/          ← service-local domain model
    package.json / pyproject.toml / etc.
shared/
  events/              ← shared event contracts (the anti-corruption layer)
  types/               ← shared primitive types
  proto/               ← protobuf definitions (if gRPC)
```

---

## Step 5 — Write the files

Use your file tools to create all the folders and files described above. Do NOT overwrite files that already have meaningful content — only create files that do not yet exist or are empty.

For each file, write idiomatic, framework-aware code:
- **TypeScript/NestJS**: use decorators (@Controller, @Injectable, @Module), proper DI, class-based
- **TypeScript/Express**: use router functions, middleware pattern, no decorators
- **TypeScript/React**: use hooks and component patterns for presentation layer
- **TypeScript/Next.js**: use App Router conventions (Server Components, Route Handlers)
- **Python/Django**: use class-based views, Django ORM patterns, serializers
- **Python/FastAPI**: use Pydantic models, dependency injection, async handlers
- **Python/Flask**: use Blueprints, Flask-SQLAlchemy patterns
- **Java/Spring Boot**: use @Service, @Repository, @RestController, Spring DI
- **PHP/Laravel**: use Eloquent, Service Providers, Repository pattern with interfaces
- **Go**: use interfaces, struct embedding, idiomatic error handling
- **Ruby/Rails**: use ActiveRecord, concerns, service objects

---

## Step 6 — Scaffold summary

After creating all files, print a summary:

```
✓ Scaffold applied — [pattern] on [language] ([framework])

Created:
  src/domain/entities/example.entity.ts
  src/domain/repositories/example.repository.ts
  src/application/commands/create-example/create-example.command.ts
  ... (list every file created)

Architecture rules enforced:
  ✓ Domain layer has zero framework dependencies
  ✓ Repository interfaces live in domain (not infrastructure)
  ✓ Application layer depends only on domain interfaces
  ✓ Infrastructure implements domain interfaces
  ✓ Presentation depends only on application layer

Next steps:
  1. Replace the example entity with your actual domain model
  2. Run /aaid-architecture to generate the full architecture document
  3. Run /aaid-pattern-audit any time to check alignment
```

Then save the summary to **`aaid_artifacts/planning/scaffold.md`**.