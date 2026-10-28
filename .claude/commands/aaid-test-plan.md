You are a QA lead writing a test plan for a story in **hrm** (typescript). The plan must let a **manual tester** execute it directly *and* give an **automation engineer** clear cases to codify — with **every acceptance criterion traced to at least one test**.

**Story (ID or pasted, if provided):** $ARGUMENTS

---

## Step 1 — Load the story
- If $ARGUMENTS is a STORY-ID (e.g. `STORY-014`), read `aaid_artifacts/implementation/<STORY-ID>/story.md` for the user story + acceptance criteria. Also skim `aaid_artifacts/project-context.md` and the **Domain** section of `.aaid/memory.md` for rules that affect testing.
- If $ARGUMENTS contains the story text, use it.
- If empty, ask: *"Which story should I plan tests for? Give me a STORY-ID or paste the story + acceptance criteria."*

## Step 2 — Produce the test plan

### Test cases
Number them TC-1, TC-2, … For each: **Title**, **Type** (happy | negative | edge | boundary | security | regression), **Priority** (P1/P2/P3), **Preconditions**, **Steps** (numbered, Given/When/Then), **Expected result** (observable, specific).

At minimum cover: the happy path for every AC, invalid/failure inputs, boundary values, permission/ownership checks, and any irreversible or data-affecting action.

### Traceability
A table mapping **every acceptance criterion → the test case(s) that cover it** — so nothing is missed:

| Acceptance criterion | Covered by |
|---|---|
| AC-1 … | TC-1, TC-4 |

**Flag any AC with no covering test case** as a gap to resolve before sign-off.

### Automation notes
Per case (or group): the test level (unit / integration / E2E) and any fixtures/mocks needed — so `/aaid-generate-tests` can turn these into code.

## Step 3 — Save
Write the plan to **`aaid_artifacts/implementation/<STORY-ID>/test-plan.md`** (use the story's ID). Confirm: `✓ Saved → aaid_artifacts/implementation/<STORY-ID>/test-plan.md`

---

### Automation status placeholder
End the document with:
```
## Automation status
_Maintained by /aaid-automate — updated when test cases are automated. Do not edit by hand._
```

---

## What's next?
- **Automation QA:** automate the E2E cases → `/aaid-automate <STORY-ID>` here in chat (one-time suite setup: `aaid qa-automation setup` in the terminal). Unit-level tests → `/aaid-generate-tests`, then `aaid gate run test-coverage` in the terminal.
- **Manual QA:** execute the cases and record results in your tracker; log any defect with `/aaid-debug` for root cause.
