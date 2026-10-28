Display the full reference of all /aaid-* slash commands, grouped by category, with CLI equivalents.

---

## 🛠 Utility & Navigation

| Command | What it does |
|---|---|
| `/aaid-help` | Show this command reference |
| `/aaid-tutorial` | **New here? Start with this.** A guided, step-by-step walkthrough — asks whether you're on a new or existing (brownfield) project, then lists exactly which commands to run, where (chat vs terminal), and why. |
| `/aaid-chat` | Open a conversation with a specialist agent — PM, Architect, Dev, QA, Security, DevOps, Reviewer, Marketing, or Docs writer — loaded with your project context. No file saved. |

---

## 📋 Planning & Discovery

Run these early in a project to produce the documents that feed every other command.

| Command | What it produces |
|---|---|
| `/aaid-migrate` | **Start here for existing projects.** Reads your codebase, interviews you, generates requirements + architecture + backlog. |
| `/aaid-requirements` | Interview-driven requirements document. |
| `/aaid-brd` | Formal Business Requirements Document — objectives, scope, stakeholders, risks. |
| `/aaid-prd` | Product Requirements Document — personas, user journeys, functional specs, open questions. |
| `/aaid-backlog` | Full prioritised backlog with epics, stories, and Fibonacci story point estimates. |
| `/aaid-roadmap` | **Visual roadmap derived from the project plan** — Now/Next/Later horizons, Mermaid gantt in `roadmap.md`, and a self-contained swimlane timeline in `roadmap.html` (prints to PDF). Asks a few optional questions you can skip. Re-render after date edits with `aaid roadmap`. |
| `/aaid-competitor-analysis` | Market landscape, competitor matrix, positioning opportunities. |
| `/aaid-gtm` | Go-to-market strategy — ICP, pricing, channels, launch phases, risk register. |
| `/aaid-marketing` | Full marketing content pack — positioning, landing page copy, Product Hunt kit, launch email sequence, social posts, SEO briefs, content calendar. |

---

## 🏗 Architecture & Design

| Command | What it produces |
|---|---|
| `/aaid-architecture` | System architecture, Mermaid diagrams, ADRs, API contracts, data model. |
| `/aaid-scaffold` | Apply a design pattern layer (clean-arch, hexagonal, CQRS, event-driven, repository…) on top of your project structure. Generates folders and starter files. |
| `/aaid-pattern-audit` | Audit existing codebase against its target architecture pattern. Scores 6 dimensions, lists every violation, produces a migration roadmap. |

---

## 💻 Development

| Command | What it produces |
|---|---|
| `/aaid-write-story` | Write a single user story card with acceptance criteria. |
| `/aaid-dev-story` | Implement a story end-to-end — source files + test files + implementation record. |
| `/aaid-test-plan` | Generate an AC-traceable test plan (manual test cases + automation notes) for a story — for QA before/after implementation. |
| `/aaid-automate` | Turn a story's test plan into tagged Playwright specs in `qa-automation/` — explores the live app via Playwright MCP, generates, runs, and updates traceability. Suite setup: `aaid qa-automation setup` (terminal). |
| `/aaid-qa-status` | QA automation dashboard — per story: test cases ⇄ automated specs ⇄ last run ⇄ AC coverage, with gaps flagged. CLI twin: `aaid qa-automation status`. |
| `/aaid-generate-tests` | Generate a complete, runnable test suite for a source file or component. |

---

## 🔒 Quality & Security

| Command | What it produces |
|---|---|
| `/aaid-review [target]` | Adversarial review — dispatches on the target: a planning artifact (`prd`, `architecture`, `backlog`…) gets a severity-tagged review written to its `review.md`; a file/dir/STORY-ID gets a code review. Asks what to review if no target is given. |
| `/aaid-review-code` | PR-style code review — inline findings, quality scores, final verdict (APPROVED / CHANGES_REQUESTED). |
| `/aaid-threat-model` | OWASP Top 10 + STRIDE threat model, secret detection, auth review, remediation priority list. |

---

## 🚀 DevOps & Infrastructure

| Command | What it produces |
|---|---|
| `/aaid-devops` | CI/CD pipeline (GitHub Actions), Dockerfile, docker-compose, .env.example, branch protection guidance. Real deploy steps for Fly.io, Railway, AWS ECS, Kubernetes, DigitalOcean, Render, or bare VPS. |
| `/aaid-k8s` | Full Kubernetes manifest set — Namespace, Deployment, Service, Ingress, HPA, PDB, NetworkPolicy, ConfigMap, Secret template, kustomization.yaml. |

---

## 📊 Sprint & Tracking

Use these daily to manage your sprint board, epics, and story lifecycle.

| Command | What it does |
|---|---|
| `/aaid-sprint-board` | Render the current sprint Kanban board — stories by column, blockers highlighted, sprint health summary. Offer to update story statuses inline. |
| `/aaid-standup` | Daily standup report — what completed yesterday, what's in progress today, what's blocked. Offer to record status updates conversationally. |
| `/aaid-epic-status` | Epic progress dashboard — per-epic progress bars, story breakdown by status, risk flags, recommended focus. |
| `/aaid-story-update` | Conversational story lifecycle transitions — "I finished STORY-003", "STORY-005 is blocked on X". Reads current state and applies changes. |
| `/aaid-backlog-groom` | AI-assisted backlog grooming session — re-scores estimates, splits large stories, identifies gaps, re-prioritizes. Updates backlog.md. |

---

## 🔧 Daily Workflow

| Command | What it does |
|---|---|
| `/aaid-debug` | Structured root cause analysis for any error or unexpected behaviour. |
| `/aaid-explain-code` | Step-by-step walkthrough of any code — WHY it works, hidden invariants, gotchas. Chat response only. |
| `/aaid-remember` | Record a decision, gotcha, pattern, or domain fact to `.aaid/memory.md` — persists across sessions and auto-loads into future ones. |
| `/aaid-commit` | Review what's about to be committed, flag anything risky (`.env`, keys, build output), then commit with AI-assistance attribution once you approve. Never stages without your yes. CLI twin: `aaid commit`. |

---

## 📈 Attribution & Reporting

Organisations increasingly need to report how much merged code was AI-assisted — and
whether AI-touched code passes quality gates as often as hand-written code. Every commit
carries an `AAID-Level` trailer, and these read it back. All of them are mechanical:
**no API key, safe in CI.**

| Command | What it does |
|---|---|
| `/aaid-commit` | Commit with an honest assistance level: `agent-authored` (an aaid agent wrote it), `agent-assisted` (you drove an AI in chat), `agent-reviewed` (human wrote it, gates ran), `human`. |
| `/aaid-report` | Pick a report, or jump straight in with `/aaid-report ai-usage --since 30d`. Interprets the numbers rather than just printing them. |
| `/aaid-pr` | Open a pull request whose description carries the branch's attribution — so it survives a squash-merge that would discard commit trailers. Detects GitHub / GitLab / Azure DevOps / Bitbucket from the remote. |

CLI equivalents:

| Command | What it does |
|---|---|
| `aaid commit --all` | Stage everything (after showing you the list), then commit attributed. |
| `aaid report` | Interactive report picker — also prints the direct command for each. |
| `aaid report ai-usage --since 90d` | Assistance levels, volume, gate-pass correlation. `--group-by month|story`, `--format csv|json`. |
| `aaid report gates` | Latest result per gate, plus the bypass audit trail. |
| `aaid report exec` | One-page status summary — scope, sprint, quality, AI assistance, risks. Composes the others. |
| `aaid report sprint` | Active sprint: goal, stories by status, points burned, blockers. `--sprint <id>` for a past one. |
| `aaid report backlog` | Stories by epic, with unestimated work called out. |
| `aaid report velocity` | Delivered points per completed sprint. Says so when there are too few to read a trend. |
| `aaid report flow` | Story cycle time — median, 85th percentile, and what is in flight. |
| `aaid report contributors` | Commit activity joined to AI attribution (aggregate unless opted in). |
| `aaid pr --push` | Open a pull/merge request with the attribution block and an `aaid:<level>` label. `--update` refreshes it after more commits. |
| `aaid attribute --install-hook` | Add attribution to a project that predates it. |

Reports land in `aaid_artifacts/reports/`. Attribution is self-reported: sound for
engineering metrics, **not** audit-grade.

---

## 📄 Docs & Publishing

| Command | What it produces |
|---|---|
| `/aaid-generate-docs` | README, API reference, CHANGELOG, CONTRIBUTING guide, component deep-dives. |
| `/aaid-publish` | Convert any artifact markdown to a formatted HTML document ready to share. |

---

## Recommended Flows

**New project:**
```
/aaid-requirements → /aaid-design → /aaid-architecture → /aaid-scaffold → /aaid-backlog → /aaid-dev-story (per story)
Daily: /aaid-standup → /aaid-story-update → /aaid-sprint-board
```

**Existing / legacy project:**
```
/aaid-migrate → /aaid-pattern-audit → /aaid-scaffold → /aaid-dev-story (new features)
```

**Launch preparation:**
```
/aaid-gtm → /aaid-marketing → /aaid-devops → /aaid-generate-docs
```

**Architecture health check:**
```
/aaid-pattern-audit → /aaid-review-code → /aaid-threat-model
```

**Not sure where to start?** Use `/aaid-chat` to think it through with a specialist first.

---

## CLI Commands (terminal)

Install: `npm install -g aaidlc` — then use `aaid`. Or `npx aaidlc` without installing.

**Project setup**
```bash
aaid init                                         # Full init wizard (single-app or workspace)
aaid init --hook-only                             # Install pre-commit hook only
aaid init --add-service                           # Add an app to an existing workspace
aaid status                                       # Project health dashboard
aaid migrate                                      # Brownfield onboarding (CLI)
```

**Agents**
```bash
aaid run pm                                       # PM agent
aaid run pm --task project-plan                   # Delivery plan (milestones, phases, resources)
aaid run pm --task roadmap                        # Visual roadmap derived from the plan (md + html)
aaid roadmap                                      # Re-render roadmap.md + roadmap.html — no AI call
aaid run architect                                # Architect agent
aaid run dev --story STORY-001                    # Dev agent
aaid run qa | security | reviewer | docs | devops
```

**Quality gates**
```bash
aaid gate run all                                 # Run all 4 gates
aaid gate run code-standards --staged             # Staged-only (pre-commit)
aaid gate run code-standards --app frontend       # Workspace: scope to one app
aaid gate skip design-review -r "spike" -e 2026-08-01
aaid gate list-bypasses
```

**Sprint & tracking**
```bash
aaid sprint plan                                  # Create + activate sprint from backlog
aaid sprint status                                # Kanban board
aaid sprint progress                              # Progress % by epic and sprint
aaid sprint velocity                              # Velocity history across all sprints
aaid sprint complete                              # Close sprint, record velocity
aaid sprint defer STORY-001 "reason"
aaid story add                                    # Add a single story to backlog
aaid story start STORY-001
aaid story review STORY-001
aaid story done STORY-001
aaid story block STORY-001 "blocked on X"
aaid epic list                                    # List all epics with progress
aaid epic add                                     # Create a new epic
aaid epic update EPIC-001 in-progress
```

> **Tip:** Type `/aaid-` in Claude Code chat to see all commands as autocomplete suggestions.