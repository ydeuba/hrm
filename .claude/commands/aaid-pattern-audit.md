You are a Principal Software Architect auditing the **hrm** (typescript) codebase for alignment with its target architecture pattern.

---

## Step 1 — Read configuration

Read `aaid.config.yaml` to retrieve:
- `project.language` — primary language
- `project.framework` — framework in use
- `project.patterns` — the target architecture pattern(s)

If no patterns are set, ask: **"Which architecture pattern should I audit against? (clean-architecture | hexagonal | cqrs | event-driven | repository | mvc | microservices)"**

---

## Step 2 — Scan the codebase

Read the following to understand the actual structure:
1. Full directory tree of `src/` (or project root for non-src projects)
2. Sample files from each top-level folder — read enough to understand naming conventions, import patterns, and responsibility distribution
3. Key entry points: `main.ts`, `app.ts`, `index.ts`, `app.py`, `main.py`, etc.
4. Any existing architecture documentation in `aaid_artifacts/planning/`

---

## Step 3 — Analyse alignment

For the target pattern, run these checks. Score each dimension 0–10.

### Layer structure (0–10)
- Do the folder names correspond to the expected layers of the target pattern?
- Are all expected layers present?
- Are there any unexpected folders that don't fit the pattern?

Expected layers per pattern:
- **clean-architecture**: domain, application, infrastructure, presentation
- **hexagonal**: core (domain + ports), adapters (inbound + outbound)
- **cqrs**: commands, queries, events, aggregates, projections
- **event-driven**: events, handlers, publishers, commands, sagas
- **repository**: models, repositories, services, controllers
- **mvc**: models, views, controllers, routes, middleware
- **microservices**: per-service dirs + shared contracts

### Dependency direction (0–10)
Read import statements in each layer and check:
- Does the domain layer import from infrastructure, framework, or external libs? (violation)
- Does the application layer import directly from infrastructure concrete classes? (violation)
- Does any layer skip layers (e.g., controller calling repository directly)? (violation)
- Do all dependencies point inward (toward domain) or toward abstractions?

List every import violation found with file path and line.

### Abstraction at boundaries (0–10)
- Are repository boundaries defined as interfaces/abstract classes, not concrete classes?
- Are external service dependencies hidden behind interfaces?
- Is there a clear anti-corruption layer for external data formats?

### Single responsibility (0–10)
Identify files that likely violate single responsibility:
- Files over 300 lines — list them
- Classes/modules with more than 5 public methods that span multiple concerns
- Files with mixed responsibilities (e.g., a service that also does HTTP response formatting)

### Naming conventions (0–10)
- Do filenames follow the pattern's conventions? (e.g., `.entity.ts`, `.handler.ts`, `.repository.ts`, `.controller.ts`)
- Are naming conventions consistent across the codebase?
- Does the naming reveal intent without needing to open the file?

### Business logic leakage (0–10)
- Is business logic found inside controllers, request handlers, or route files?
- Are there complex conditionals or domain calculations in the presentation layer?
- Are there raw SQL queries or ORM calls outside the infrastructure layer?

---

## Step 4 — Produce the audit report

Output the report in this format:

```
# Pattern Audit — [pattern] — [date]

## Project: [name] ([language] / [framework])
## Target pattern: [pattern]

---

## Overall Alignment Score: [X]/100

| Dimension              | Score | Status |
|---|---|---|
| Layer structure        | X/10  | ✓ / ⚠ / ✗ |
| Dependency direction   | X/10  | ✓ / ⚠ / ✗ |
| Abstraction boundaries | X/10  | ✓ / ⚠ / ✗ |
| Single responsibility  | X/10  | ✓ / ⚠ / ✗ |
| Naming conventions     | X/10  | ✓ / ⚠ / ✗ |
| Business logic leakage | X/10  | ✓ / ⚠ / ✗ |

---

## What's Well-Aligned
[specific files and patterns that correctly follow the target pattern — be concrete]

---

## Violations Found

### Critical (breaks the pattern fundamentally)
- [file:line] — [what the violation is] — [why it matters]

### Warnings (weakens the pattern)
- [file:line] — [what the issue is] — [recommended fix]

### Minor (convention / consistency)
- [file:line] — [what to improve]

---

## Missing Pieces
[Layers or abstractions that the target pattern requires but don't exist yet]
- ✗ [missing layer/concept] — [why it's needed] — [what to create]

---

## Migration Roadmap

Ordered steps to reach full pattern alignment. Each step is independent enough to be a single PR.

### Step 1 — [title] (Priority: Critical / High / Medium)
[What to do, which files to move/create/refactor, expected outcome]

### Step 2 — [title]
...

---

## Architecture Rules (for future enforcement)
[Extract 4–6 concrete rules that can be checked mechanically]
Example: "No import from infrastructure in domain files"
Example: "All repository access must go through an interface, not a concrete class"
```

---

## Step 5 — Save

Write the complete audit report to **`aaid_artifacts/planning/pattern-audit.md`**.

Confirm: `✓ Pattern audit saved → aaid_artifacts/planning/pattern-audit.md`

Then suggest:
- Run `/aaid-scaffold` to apply the missing layer structure
- Run `/aaid-architecture` to update the architecture document to reflect the target pattern
- Use the Migration Roadmap as input to `/aaid-backlog` to create stories for each step