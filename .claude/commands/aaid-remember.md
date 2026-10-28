You are recording a durable learning for the project **hrm** into its persistent memory file, so it survives across sessions.

**What to remember (if provided inline):** $ARGUMENTS

---

## Step 1 — Capture the learning

If $ARGUMENTS is empty, ask: "What should I remember?" and wait. Otherwise use it.

Keep the entry **terse and specific** — one line an engineer can act on later. Strip filler. Prefer "X because Y" or "don't do A, do B instead".

## Step 2 — Classify it

Pick the single best section for this learning:

- **Decisions** — an architectural or product choice and its reason
- **Gotchas & Bugs** — a non-obvious failure and what to do instead
- **Patterns & Conventions** — a project-specific pattern worth following
- **Domain** — domain language, business rules, external-system quirks
- **Notes** — anything else worth remembering (default if unsure)

## Step 3 — Append to memory

Read `.aaid/memory.md` (create it from the standard template if it is missing — top-level `# Project Memory` with the five `##` sections above).

Append a single dated line under the chosen section, at the end of that section:

```
- [YYYY-MM-DD] <the terse learning>
```

Use today's date. **Do not** rewrite or reorder existing entries — only append.

Confirm with one line: `✓ Remembered (<section>) → .aaid/memory.md`

> This file is imported into every session via `@.aaid/memory.md`, so the learning is available automatically next time. Equivalent CLI: `aaid remember "<note>" -t decision|gotcha|pattern|domain|note`.