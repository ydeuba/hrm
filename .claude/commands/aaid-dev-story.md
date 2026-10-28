You are an expert typescript developer implementing a user story for the project **hrm**.

Your job is to produce complete, production-ready source and test files that satisfy every acceptance criterion. No TODOs, no placeholders, no stub logic.

**Story to implement (if provided inline):** $ARGUMENTS

---

## Step 1 — Interview

If $ARGUMENTS contains the story, extract it. Otherwise ask these questions **one at a time**:

1. **Is this a prototype/spike or production-ready work?**
   - **Prototype/spike**: I will focus on learning and speed — relaxed test coverage, minimal error handling, no gate compliance required.
   - **Production**: I will apply all hrm standards: full test coverage, proper error handling, gate-compliant output.
2. Paste the story: the user narrative (As a / I want / so that) and all acceptance criteria.
3. What is the file path for the source file to create or modify? (e.g. `src/services/booking.service.ts`)
4. Are there any existing interfaces, types, or base classes this must extend or implement? Paste them.
5. What external dependencies should be used? (e.g. specific ORM, HTTP client, validation library)
6. Are there any related completed stories in this epic I should be aware of?

Once you have the full story context, say "Got it — implementing now." and produce the output below.

---

## Step 2 — Output

Produce exactly these four sections in order. The section headings and path format are parsed by aaid — do not alter them.

## Source file
**Path:** `<relative/path/to/source.ts>`

```typescript
// Complete, runnable source file
// Follow hrm coding standards: clean-architecture
// No TODOs, no placeholder logic, no commented-out code
```

## Test file
**Path:** `<same/path/source.test.ts>`

```typescript
// Complete test suite covering all acceptance criteria
// Unit tests: happy path + boundaries + error paths for every exported function
// Mock all external I/O — no real database, HTTP, or file system calls in unit tests
```

## Implementation notes
Write 2–4 paragraphs explaining:
- Key design decisions and why you made them
- How the implementation satisfies each acceptance criterion
- Any trade-offs or constraints the reviewer should know about
- Anything that would require follow-up in a future story

## Acceptance criteria status
For every AC in the story, mark its status. The aaid CLI parses this section exactly — use this format:

- [x] AC-1: satisfied — brief explanation of how
- [x] AC-2: satisfied — brief explanation of how
- [ ] AC-3: not satisfied — reason (e.g. "requires OAuth provider integration, out of scope for this story")

Every unchecked AC will be flagged as a gap. If an AC truly cannot be satisfied in this story, explain why and suggest a follow-up story.

---

## Step 3 — Save

Write all generated files using your file tools:
- The **source file** to the path decided during the interview
- The **test file** to its corresponding test path
- A **story implementation record** to `aaid_artifacts/implementation/[STORY-ID]/impl-notes.md` containing the implementation notes and AC status

After saving, confirm with: `✓ Saved source, test, and implementation record`

---

## What's next?

Story is implemented. Here's the recommended flow before marking it done:

1. **Plan QA coverage** → use `/aaid-test-plan` here in chat — an AC-traceable test plan (manual cases + automation notes) so QA knows exactly what to verify
2. **Generate additional tests** → use `/aaid-generate-tests` here in chat (edge cases, integration tests)
3. **Run quality gates** → `aaid gate run all` in the terminal to check code standards, test coverage, and security
4. **Code review** → use `/aaid-review-code` here in chat for a structured review before sign-off

**Would you like me to draft the test plan for this story now, or go straight to gates?**