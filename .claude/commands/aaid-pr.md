You are opening a pull request for **hrm** (typescript), carrying the
branch's AI-assistance attribution so it survives the merge.

**Inline instructions (if provided):** $ARGUMENTS

A pull request is **outward-facing** — it notifies reviewers and, on a client repository, is
visible to the client. Never create or update one before the human explicitly agrees.

---

## Step 1 — Work out what is being proposed

```bash
git rev-parse --abbrev-ref HEAD
git log --oneline origin/HEAD..HEAD 2>/dev/null || git log --oneline main..HEAD
git status --short
```

Report:

- **Branch** and its target (usually the repository default branch)
- **Commits** on the branch that are not on the target
- Anything **uncommitted** — those changes will NOT be in the request

If there are no commits ahead of the target, say so and stop. If there is uncommitted work,
point it out and offer `/aaid-commit` first — a request that omits half the change wastes a
reviewer's time.

If the branch has never been pushed, say so: the host cannot see it yet.

## Step 2 — Read the attribution off the commits

```bash
git log --format='%h %s%n  level=%(trailers:key=AAID-Level,valueonly) agents=%(trailers:key=AAID-Agents,valueonly)' origin/HEAD..HEAD
```

Summarise for the human:

- The **strongest level present** — that is what the request will claim. One
  `agent-authored` commit among nine human ones still means an agent wrote part of this, and
  a reviewer needs to know.
- How many commits carry **no** attribution (made before aaid was installed here, or with the
  hook bypassed). Say the number; do not quietly treat them as human.

## Step 3 — Draft the title and description

Title: conventional-commit style, imperative, under 72 characters. Derive it from the actual
commits, not from the branch name.

Description — write the **Changes** narrative yourself; `aaid pr` appends the attribution
block. Cover:

- What changed and why
- Anything a reviewer should look at first
- Test or verification notes
- Linked stories, if the commits carry `AAID-Story` trailers

Do not write the attribution table by hand. `aaid pr` generates it from a canonical data
block so the human-readable table and the machine-readable data cannot drift.

## Step 4 — Ask

Show the human the title, the description you drafted, the level that will be claimed, and the
label that will be applied. Then ask:

> Open this pull request against \`<base>\`?
>
> Reply **yes**, **edit** to revise the title or description, **draft** to open it as a draft,
> or **no** to stop.

**Wait. Do not run anything until they answer.**

## Step 5 — Create it

Write your description to a file, then let the CLI attach attribution and talk to the host:

```bash
aaid pr --body-file <path> --push --yes
```

Add `--draft` if they chose draft. Add `--base <branch>` if the target is not the default.
Use `--update` instead when a request already exists and they want the block refreshed.

The host is detected from the git remote — GitHub (`gh`), GitLab (`glab`, which calls them
**merge requests**), Azure DevOps (`az repos`), Bitbucket (browser only, no CLI exists).
If the host CLI is not installed, `aaid pr` prints the description and a create-request link;
relay both rather than pretending it was created.

Report the URL it returns.

## Step 6 — Say the thing about squash-merge

If the request was created, mention once:

> If this repository squash-merges using only the PR title, the commit trailers are discarded
> at merge. The description block survives, but per-commit attribution will not — worth
> checking the repository's merge settings if the reporting numbers matter.

## Step 7 — Next steps

- `/aaid-report` — the AI-assistance picture for this project
- `aaid pr --update` — (CLI, in terminal) refresh the block after pushing more commits
- `/aaid-review` — adversarial review before a reviewer sees it
- `/aaid-commit` — commit the remaining unstaged work

Then ask what they want to do next.
