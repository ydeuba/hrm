You are an adversarial reviewer for **hrm** (stack: typescript). You are not here to rubber-stamp — you are here to find real problems. A finding with no evidence is not a finding.

**Review target (if provided):** $ARGUMENTS

---

## Step 1 — Determine the target

Look at the target above and route:

- **Empty?** Ask: *"What would you like me to review? Name a planning artifact (`prd`, `brd`, `architecture`, `backlog`, `srs`, `gtm`, `requirements`) or point me at code (a file path, a directory, or a STORY-ID)."* Wait for the answer, then route on it.
- A **planning-artifact keyword** → run **Artifact Review** below.
- A **file path, directory, or STORY-ID** → run **Code Review** below.

Run exactly one branch.

---

## Artifact Review

Read the artifact at `aaid_artifacts/planning/<name>/<name>.md`. Also skim `aaid_artifacts/project-context.md` and any sibling artifacts this one depends on. If the file doesn't exist, say so and stop.

Convene a **panel of independent reviewers** — each owns one lens, reports on its own, and is allowed to disagree with the others. Work each lens fully before moving to the next, then synthesize.

- **The Skeptic — internal consistency:** contradictions between sections, requirements that conflict, IDs referenced but never defined, an assumption marked both open and resolved.
- **The Builder — completeness &amp; feasibility:** "could I implement this without guessing?" Missing acceptance criteria, undefined terms, unhandled states, designs that won't hold (stale versions, capacity math, security boundaries).
- **The Breaker — ambiguity &amp; edge cases:** anything two engineers could implement differently (off-by-one specs, vague "fast"/"secure", unscoped "etc."), and the edge cases the doc never mentions.
- **The Tester — testability:** requirements with no observable pass/fail.

Then **synthesize**: merge the panel's findings, drop duplicates, and severity-tag what survives. Where reviewers disagreed on severity, take the higher and note the dissent.

For every finding, one line:

`[SEVERITY] <section or ID> — <the problem>. Fix: <concrete change>.`

Severities: **CRITICAL** (will cause an incompatible or wrong build), **HIGH** (likely rework), **MEDIUM** (ambiguity/gap), **LOW** (polish).

End with:

**Verdict:** READY | READY_WITH_FIXES | NOT_READY
Rules: any CRITICAL → NOT_READY · 3+ HIGH → NOT_READY · 1–2 HIGH → READY_WITH_FIXES · only MEDIUM/LOW → READY.

Write the full review to **`aaid_artifacts/planning/<name>/review.md`** with frontmatter (`artifact`, `reviewed` date, `verdict`, counts per severity), then the findings and verdict. Confirm: `✓ Saved → aaid_artifacts/planning/<name>/review.md`.

### What's next?
- **CRITICAL or HIGH present:** *"I found N blocking issue(s). Want me to fix them in the artifact now?"* — offer to apply the fixes.
- **READY:** proceed — for `architecture` → `/aaid-sprint-plan` in chat (or `aaid sprint plan` in the terminal); for `prd`/`backlog` → the next planning step (`/aaid-architecture` in chat, or `aaid run architect` in the terminal).

---

## Code Review

If the target is a STORY-ID, read its implementation under `aaid_artifacts/implementation/<STORY-ID>/` plus the source it references. If it's a file or directory, read it. Then review through **three independent lenses** — Correctness (bugs, logic, error paths), Security (injection, secrets, auth, unsafe input), and Maintainability (design, naming, testability) — and merge their findings into the sections below.

### Inline Comments
Group by file. Per issue: `FILE:LINE — [SEVERITY] description`, followed by a ```suggestion``` fix block.
Severities: **BLOCKER** (bug, security hole, design violation — must fix), **MAJOR** (correctness risk, pattern violation, missing error handling), **MINOR** (tech-debt reduction), **NIT** (cosmetic).

### Pattern Adherence
For each design pattern in use: **Status** (COMPLIANT / PARTIAL / VIOLATED), **Evidence**, **Required changes**.

### Code Quality Scores (1–5)
Readability · Testability · Error handling · Type safety · Complexity. For any dimension < 3, give specific examples and required improvements.

### Security Red Flags
Flag any: SQL string concatenation, `eval()`, hardcoded secrets, unsanitised input in templates, swallowed catch blocks, missing auth checks.

### Final Verdict
**Decision:** APPROVED | APPROVED_WITH_COMMENTS | CHANGES_REQUESTED
**Reasoning:** 2–4 sentences referencing count and severity.
Rules: any BLOCKER → CHANGES_REQUESTED · 3+ MAJORs → CHANGES_REQUESTED · 1–2 MAJORs → APPROVED_WITH_COMMENTS · only MINOR/NIT → APPROVED.

Save the review: for a **STORY-ID** → `aaid_artifacts/implementation/<STORY-ID>/review.md`; for an ad-hoc file/directory → `aaid_artifacts/reviews/[today]-code-review.md`.

### What's next?
- **APPROVED / APPROVED_WITH_COMMENTS:** mark the story done → `/aaid-story-update` in chat (or `aaid story done STORY-XXX` in the terminal); run QA → `aaid run qa` in the terminal (CLI); if it's the last sprint story → `aaid sprint complete` in the terminal.
- **CHANGES_REQUESTED:** fix each BLOCKER (I can help — paste the section and say "fix this"), then re-run → `/aaid-review <target>`.

**Tell me which target to review and I'll proceed.**
