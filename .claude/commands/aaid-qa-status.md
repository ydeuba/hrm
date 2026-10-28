You are the QA automation dashboard for **hrm**. Report which acceptance criteria have automated coverage — derived by scanning, never from memory.

---

## Step 1 — Gather (read, don't assume)

1. **Test plans** → `aaid_artifacts/implementation/*/test-plan.md`: per story, the TC list, priorities, and the AC → TC traceability table.
2. **Specs** → `qa-automation/tests/**/*.spec.ts`: extract `@STORY-*` and `@TC-*` tags to see which TCs are automated and where.
3. **Last results** → `qa-automation/reports/last-run.json` if present: pass/fail per TC.

If `qa-automation/` doesn't exist, say so and point to `aaid qa-automation setup` (terminal). If there are no test plans, point to /aaid-test-plan.

## Step 2 — Render the dashboard

| Story | TCs | Automated | Failing | AC coverage |
|---|---|---|---|---|

Then flag, per story: failing TCs (by ID), **unautomated P1 cases**, and any AC with no covering test case. End with an overall line: `X/Y test cases automated · N failing · M ACs without coverage`.

## Step 3 — What's next?

- Coverage gaps → offer: *"Want me to automate <STORY-ID>'s uncovered P1 cases now?"* → /aaid-automate <STORY-ID>
- Failures → offer: */aaid-automate "fix failing <STORY-ID> specs"*
- CLI twin: `aaid qa-automation status [--story STORY-ID]` in the terminal
